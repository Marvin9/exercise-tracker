const koa = require('koa');
const app = new koa();
const router = require('./api/routes');
const parser = require('koa-bodyparser');

app.use(parser());
app.use(router);

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => console.log("Server running at port ", PORT));
