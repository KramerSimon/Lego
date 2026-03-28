import partsModel from './parts.model.js';
function getParts(request, response) {
  partsModel.getAll(request.query)
    .then(items => {
      response.json(items);
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve Parts' });
    });
}
function getPart(request, response) {
  const id = request.params.id;
  partsModel.getItem(id)
    .then(item => {
      if (item) {
        response.json(item);
      } else {
        response.status(404).json({ error: 'Part not found' });
      }
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve Part' });
    });
}
export { getParts, getPart };
