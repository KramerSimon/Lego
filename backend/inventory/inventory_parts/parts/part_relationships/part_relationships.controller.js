import part_relationshipsModel from './part_relationships.model.js';
function getPartRelationships(request, response) {
  part_relationshipsModel.getAll(request.query)
    .then(items => {
      response.json(items);
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve PartRelationships' });
    });
}
function getPartRelationship(request, response) {
  const id = request.params.id;
  part_relationshipsModel.getItem(id)
    .then(item => {
      if (item) {
        response.json(item);
      } else {
        response.status(404).json({ error: 'PartRelationship not found' });
      }
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve PartRelationship' });
    });
}
export { getPartRelationships, getPartRelationship };
