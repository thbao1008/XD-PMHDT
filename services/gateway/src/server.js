import express from 'express';
const app = express();
app.get('/health', (_,res) => res.json({ok:true, service:'gateway'}));
app.use('/auth', (req,res) => res.redirect('http://auth:' + (process.env.PORT || 4001) + req.path));
const port = process.env.PORT || 8080;
app.listen(port, () => console.log(Gateway listening on \));
