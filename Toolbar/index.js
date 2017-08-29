import * as d3 from 'd3';
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

    menuItemLinks.select('img')
      .attr('src', d => d.icon)
      .attr('draggable', false);
    menuItems.select('label').text(d => d.label);

    menuItems.each(function (d) {
      let menuItem = d3.select(this);
      if (d.events) {
        Object.keys(d.events).forEach(eventStr => {
          menuItem.on(eventStr, function () {
            d.events[eventStr].call(this, d);
          });
        });
      }
    });
  }
}

export { Toolbar };

class AppToolbar extends Toolbar {
  constructor () {
    super([]);
    this.menuData = this.buildAppMenu();
    this.longPressTimeout;
    this.longPressed = false;
  }
  toggleNewTabClass () {
    let newTab = this.longPressed;
    if (d3.event) {
      newTab = newTab ||
        d3.event.altKey ||
        d3.event.ctrlKey ||
        d3.event.metaKey ||
        d3.event.shiftKey;
    }
    this.d3el.classed('newTab', newTab);
  }
  setup (d3el) {
    super.setup(d3el);
    d3.select(document)
      .on('keydown', () => {
        this.toggleNewTabClass();
      })
      .on('keyup', () => {
        this.toggleNewTabClass();
      });
  }
  buildAppMenu () {
    let appMenu = [];
    Object.keys(mure.appList).forEach(appName => {
      appMenu.push({
        events: {
          mousedown: () => {
            this.longPressed = false;
            window.clearTimeout(this.longPressTimeout);
            this.longPressTimeout = window.setTimeout(() => {
              this.longPressed = true;
              this.toggleNewTabClass();
            }, 1000);
          },
          mouseup: () => {
            let newTab = this.longPressed;
            if (d3.event) {
              newTab = newTab ||
                d3.event.altKey ||
                d3.event.ctrlKey ||
                d3.event.metaKey ||
                d3.event.shiftKey;
            }
            mure.openApp(appName, newTab);
            this.longPressed = false;
            this.toggleNewTabClass();
          },
          mouseover: () => {
            this.toggleNewTabClass();
          },
          mouseout: () => {
            window.clearTimeout(this.longPressTimeout);
            this.longPressed = false;
            this.toggleNewTabClass();
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
