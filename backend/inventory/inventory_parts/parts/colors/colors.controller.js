import colorsModel from './colors.model.js';
function getColors(request, response) {
  colorsModel.getAll(request.query)
    .then(items => {
      response.json(items);
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve Colors' });
    });
}
function getColor(request, response) {
  const id = request.params.id;
  colorsModel.getItem(id)
    .then(item => {
      if (item) {
        response.json(item);
      } else {
        response.status(404).json({ error: 'Color not found' });
      }
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve Color' });
    });
}
export { getColors, getColor };
