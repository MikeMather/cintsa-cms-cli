const AWS = require('aws-sdk');
const nj = require('nunjucks');
const marked  = require('marked');

const S3 = new AWS.S3({apiVersion: '2006-03-01'});
const { BUCKET } = process.env;

const S3Loader = nj.Loader.extend({
  async: true,
  getSource: function (name, callback) {
    const key = name.split('admin/')[1];
    const params = {
      Bucket: BUCKET,
      Key: `admin/${key}`
    };
    S3.getObject(params, (err, data) => {
      if (!err) {
        callback(err, {
          src: data.Body.toString(),
          path: name,
          noCache: false
        });
      }
      else {
        console.log(err.stack);
      }
    });
  }
});

const getFile = path => {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: BUCKET,
      Key: path
    };
    S3.getObject(params, (err, data) => {
      if (!err) {
        resolve(JSON.parse(data.Body.toString()));
      }
      else {
        console.log(err.stack);
        reject();
      }
    });
  })
}

const env = new nj.Environment([new S3Loader()])

const listBucket = () => {
  return new Promise((resolve, reject) => {
    S3.listObjectsV2({ Bucket: BUCKET, Prefix: 'admin'}, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data.Contents.map(d => d.Key));
    })
  })
}

const formatPieceData = (schema, piece) => {
  const formattedPiece = { ...piece };
  schema.fields.forEach(field => {
    if (field.type === 'markdown') {
      formattedPiece[field.name] = marked(formattedPiece[field.name]);
    }
  })
  return formattedPiece
};

const getGlobalData = async (keys, schemas) => {
  const global = {
    pieces: {}
  };
  const promises = []
  return new Promise((resolve, reject) => {
    keys.forEach(key => {
      const promise = getFile(key).then(data => {
        const match = key.match(/admin\/pieces\/(.*)\/(.*)?/);
        const pieceName = match[1];
        const schema = schemas[pieceName];
        const view = formatPieceData(schema, data);
        // Add pieces to global data
        if (view.status === 'published') {
          if (global.pieces[pieceName]) {
            global.pieces[pieceName].push(view);
          }
          else {
            global.pieces[pieceName] = [view];
          }
        }
      });
      promises.push(promise);
    });
    Promise.all(promises).then(() => {
      resolve(global);
    })
  })
}

const getSchemas = async keys => {
  return new Promise((resolve, reject) => {
    const schemas = {};
    const promises = [];
    keys.forEach(key => {
      const promise = getFile(key).then(data => {
        schemas[data.name] = data;
      });
      promises.push(promise);
    });
    Promise.all(promises).then(() => {
      resolve(schemas);
    })
  })
}

const saveFile = async (html, { slug }) => {
  const Key = slug ? `${slug}/index.html` : 'index.html';
  const params = {
    Key,
    Body: html,
    Bucket: BUCKET,
    ContentType: 'text/html'
  };
  return S3.putObject(params).promise();
}

const renderView = async (layout, view, piece) => {
  return new Promise((resolve, reject) => {
    env.render(layout, view, (err, data) => {
      if (!err) {
        resolve(saveFile(data, piece))
      }
      else {
        reject()
      }
    });
  })
}

const renderPieces = async (pieces, global) => {
  const promises = [];
  return new Promise((resolve, reject) => {
    pieces.forEach(piece => {
      const layout = `admin/layouts/${piece.layout}.njk`;
      const view = {
        global,
        ...piece
      }
      const promise = renderView(layout, view, piece);
      promises.push(promise);
    });
    Promise.all(promises).then(() => {
      resolve();
    })
  });
}

const renderRootLevelFiles = (files, global) => {
  const promises = [];
  return new Promise((resolve, reject) => {
    files.forEach(file => {
      const view = {
        global
      };
      const match = file.match(/admin\/(.*)\.njk/);
      const filename = match[1];
      let slug;
      if (filename === 'index') {
        slug = ''
      }
      else {
        slug = filename
      }
      const promise = renderView(file, view, { slug });
      promises.push(promise);
    });
    Promise.all(promises).then(() => {
      resolve()
    })
  });
}

const main = async () => {
  const processes = [];
  const files = await listBucket();
  const schemasPaths = files.filter(path => path.includes('schema.json'));
  const piecePaths = files.filter(path => path.split('.').pop() === 'json' && !path.includes('schema.json'));
  const rootPaths = files.filter(path => path.split('/').length === 2);
  const schemas = await getSchemas(schemasPaths);
  const global = await getGlobalData(piecePaths, schemas);
  processes.push(renderRootLevelFiles(rootPaths, global));
  Object.keys(global.pieces).forEach(pieceName => {
    processes.push(renderPieces(global.pieces[pieceName], global));
  });
  return new Promise((resolve, reject) => {
    Promise.all(processes).then(() => {
      resolve()
    })
  });
}

exports.handler = async (event, context, callback) => {
  await main();
};
