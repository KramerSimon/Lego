import inventory_minifigsModel from './inventory_minifigs.model.js';
function getInventoryMinifigs(request, response) {
  inventory_minifigsModel.getAll(request.query)
    .then(items => {
      response.json(items);
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve InventoryMinifigs' });
    });
}
function getInventoryMinifig(request, response) {
  const id = request.params.id;
  inventory_minifigsModel.getItem(id)
    .then(item => {
      if (item) {
        response.json(item);
      } else {
        response.status(404).json({ error: 'InventoryMinifig not found' });
      }
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve InventoryMinifig' });
    });
}
export { getInventoryMinifigs, getInventoryMinifig };
