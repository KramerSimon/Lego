import inventory_setsModel from './inventory_sets.model.js';
function getInventorySets(request, response) {
  inventory_setsModel.getAll(request.query)
    .then(items => {
      response.json(items);
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve InventorySets' });
    });
}
function getInventorySet(request, response) {
  const id = request.params.id;
  inventory_setsModel.getItem(id)
    .then(item => {
      if (item) {
        response.json(item);
      } else {
        response.status(404).json({ error: 'InventorySet not found' });
      }
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve InventorySet' });
    });
}
export { getInventorySets, getInventorySet };
