import express from 'express';
import bodyParser from 'body-parser';
import inventoryRouter from '/inventory/inventory.router.js';
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/inventory', inventoryRouter);
app.get('/', (request, response) => {
  res.redirect('/inventory');
});
app.use(express.static(__dirname))
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});