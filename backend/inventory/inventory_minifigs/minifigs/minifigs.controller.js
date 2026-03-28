import minifigsModel from './minifigs.model.js';
function getMinifigs(request, response) {
  minifigsModel.getAll(request.query)
    .then(items => {
      response.json(items);
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve Minifigs' });
    });
}
function getMinifig(request, response) {
  const id = request.params.id;
  minifigsModel.getItem(id)
    .then(item => {
      if (item) {
        response.json(item);
      } else {
        response.status(404).json({ error: 'Minifig not found' });
      }
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve Minifig' });
    });
}
export { getMinifigs, getMinifig };
