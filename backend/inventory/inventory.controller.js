import inventoryModel from './inventory.model.js';
function getInventories(request, response) {
  inventoryModel.getAll(request.query)
    .then(inventory => {
      response.json(inventory);
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve inventory' });
    });
}
function getInventory(request, response) {
  const id = request.params.id;
  inventoryModel.getItem(id)
    .then(item => {
      if (item) {
        response.json(item);
      } else {
        response.status(404).json({ error: 'Inventory item not found' });
      }
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve inventory item' });
    });
}
export { getInventories, getInventory };