import { View } from 'uki';
import template from './template.html';
import './style.scss';

class Toolbar extends View {
  constructor (menuData) {
    super();
    this.menuData = menuData;
  }
  setup (d3el) {
    d3el.html(template);
  }
  draw (d3el) {
    let menuItems = d3el.select('ul').selectAll('li').data(this.menuData);
    menuItems.exit().remove();
    let menuItemsEnter = menuItems.enter().append('li');
    let menuItemLinksEnter = menuItemsEnter.append('a');
    menuItemLinksEnter.append('img');
    menuItemsEnter.append('label');

    menuItems = menuItemsEnter.merge(menuItems);

    menuItems.classed('button', true)
      .classed('selected', d => d.selected);
    let menuItemLinks = menuItems.select('a');

    menuItemLinks.select('img').attr('src', d => d.icon);
    menuItems.select('label').text(d => d.label);

    menuItems.on('click', function (d) {
      d.onclick.call(this, d);
    });
  }
}

export default Toolbar;
