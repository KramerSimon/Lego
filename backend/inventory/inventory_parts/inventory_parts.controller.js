import inventory_partsModel from './inventory_parts.model.js';
function getInventoryParts(request, response) {
  inventory_partsModel.getAll(request.query)
    .then(items => {
      response.json(items);
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve InventoryParts' });
    });
}
function getInventoryPart(request, response) {
  const id = request.params.id;
  inventory_partsModel.getItem(id)
    .then(item => {
      if (item) {
        response.json(item);
      } else {
        response.status(404).json({ error: 'InventoryPart not found' });
      }
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve InventoryPart' });
    });
}
export { getInventoryParts, getInventoryPart };
