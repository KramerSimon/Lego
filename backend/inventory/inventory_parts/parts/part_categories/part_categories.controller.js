import part_categoriesModel from './part_categories.model.js';
function getPartCategorys(request, response) {
  part_categoriesModel.getAll(request.query)
    .then(items => {
      response.json(items);
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve PartCategorys' });
    });
}
function getPartCategory(request, response) {
  const id = request.params.id;
  part_categoriesModel.getItem(id)
    .then(item => {
      if (item) {
        response.json(item);
      } else {
        response.status(404).json({ error: 'PartCategory not found' });
      }
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve PartCategory' });
    });
}
export { getPartCategorys, getPartCategory };
