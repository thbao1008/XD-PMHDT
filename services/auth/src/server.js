import express from 'express';
const app = express();
app.use(express.json());
app.get('/health', (req,res) => res.json({ok:true, service:'auth'}));
app.get('/', (req,res) => res.json({message: 'Auth service placeholder'}));
const port = process.env.PORT || 4001;
app.listen(port, () => console.log(Auth service listening on \));
