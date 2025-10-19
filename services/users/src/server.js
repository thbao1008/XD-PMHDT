import express from 'express';
const app = express();
app.use(express.json());
app.get('/health', (req,res) => res.json({ok:true, service:'users'}));
app.get('/', (req,res) => res.json({message: 'Users service placeholder'}));
const port = process.env.PORT || 4002;
app.listen(port, () => console.log(Users service listening on \));
