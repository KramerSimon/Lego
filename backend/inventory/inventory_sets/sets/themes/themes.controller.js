import themesModel from './themes.model.js';
function getThemes(request, response) {
  themesModel.getAll(request.query)
    .then(items => {
      response.json(items);
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve Themes' });
    });
}
function getTheme(request, response) {
  const id = request.params.id;
  themesModel.getItem(id)
    .then(item => {
      if (item) {
        response.json(item);
      } else {
        response.status(404).json({ error: 'Theme not found' });
      }
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve Theme' });
    });
}
export { getThemes, getTheme };
