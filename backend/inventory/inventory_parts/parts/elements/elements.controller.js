import elementsModel from './elements.model.js';
function getElements(request, response) {
  elementsModel.getAll(request.query)
    .then(items => {
      response.json(items);
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve Elements' });
    });
}
function getElement(request, response) {
  const id = request.params.id;
  elementsModel.getItem(id)
    .then(item => {
      if (item) {
        response.json(item);
      } else {
        response.status(404).json({ error: 'Element not found' });
      }
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve Element' });
    });
}
export { getElements, getElement };
