const AWS = require('aws-sdk');
const nj = require('nunjucks');
const fm = require('front-matter');
const marked  = require('marked');

const S3 = new AWS.S3({apiVersion: '2006-03-01'});
const { BUCKET, REGION } = process.env;

const S3Loader = nj.Loader.extend({
    async: true,
    getSource: function(name, callback) {
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

const getFile = (path) => {
    return new Promise((resolve, reject) => {
        const params = {
            Bucket: BUCKET, 
            Key: path
        };
        S3.getObject(params, (err, data) => {
            if (!err) {
                const frontMatter = fm(data.Body.toString());
                resolve(frontMatter);
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

const getGlobalData = async (keys) => {
    const global = {
        pieces: {}
    };
    const promises = [];
    return new Promise((resolve, rejec) => {
        keys.forEach(key => {
            const promise = getFile(key).then((data) => {
                const view = data.attributes;
                view.content = marked(data.body);
                const match = key.match(/admin\/pieces\/(.*)\/(.*)?/);
                const pieceName = match[1];
                // Only add published pieces to global data
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
            if (piece.status === 'published') {
                const layout = `admin/layouts/${piece.layout}.njk`;
                const view = {
                    global,
                    ...piece
                }
                const promise = renderView(layout, view, piece);
                promises.push(promise);
            }
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
    return new Promise(async (resolve, reject) => {
        const processes = [];
        const files = await listBucket();
        const piecePaths = files.filter(path => path.split('.').pop() === 'md');
        const rootPaths = files.filter(path => path.split('/').length === 2);
        const global = await getGlobalData(piecePaths);
        processes.push(renderRootLevelFiles(rootPaths, global));
        Object.keys(global.pieces).forEach((pieceName) => {
            processes.push(renderPieces(global.pieces[pieceName], global));
        });   
        Promise.all(processes).then(() => {
            resolve()
        })
    })
}

/**
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 * @param {Object} context
 * @returns {Object} object - API Gateway Lambda Proxy Output Format 
 */
exports.handler = async (event, context, callback) => {
    await main();
};
