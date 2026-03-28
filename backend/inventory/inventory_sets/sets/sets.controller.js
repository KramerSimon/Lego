import setsModel from './sets.model.js';
function getSets(request, response) {
  setsModel.getAll(request.query)
    .then(items => {
      response.json(items);
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve Sets' });
    });
}
function getSet(request, response) {
  const id = request.params.id;
  setsModel.getItem(id)
    .then(item => {
      if (item) {
        response.json(item);
      } else {
        response.status(404).json({ error: 'Set not found' });
      }
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve Set' });
    });
}
export { getSets, getSet };
