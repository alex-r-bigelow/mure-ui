import mure from 'mure';
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
export { Toolbar };

class AppToolbar extends Toolbar {
  constructor () {
    super([]);
    this.menuData = this.buildAppMenu();
  }
  buildAppMenu () {
    let appMenu = [];
    Object.keys(mure.appList).forEach(appName => {
      appMenu.push({
        onclick: () => {
          if (mure.currentApp !== appName) {
            mure.openApp(appName);
          }
        },
        label: appName === 'docs' ? 'Main app' : 'docs',
        icon: mure.appList[appName].icon,
        selected: mure.currentApp === appName
      });
    });
    return appMenu;
  }
}
export { AppToolbar };
