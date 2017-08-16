import * as d3 from 'd3';
window.d3 = d3; // strap d3 to the window for debugging console access
import { DocView, Toolbar, AppToolbar, NewFileDialog, updateImgColorFilters } from '../index.js';
import './style.scss';
updateImgColorFilters();

import emptyState from '!raw-loader!./img/emptyState.svg';

import gearIcon from './img/gear.svg';
import newFileIcon from './img/newFile.svg';

let opsMenu = [
  {
    label: 'Settings',
    icon: gearIcon,
    onclick: () => {
      console.log('todo: settings dialog');
    }
  },
  {
    label: 'New File',
    icon: newFileIcon,
    onclick: () => {
      new NewFileDialog(newFileSpecs => {
        console.log('Clicked the new file button!');
        console.log(newFileSpecs);
      }).render();
    }
  }
];

let docView;
let appMenu;
let fileOpsMenu;

function setup () {
  docView = new DocView(emptyState);
  docView.render(d3.select('#docView'));

  appMenu = new AppToolbar();
  appMenu.render(d3.select('#appMenu'));

  fileOpsMenu = new Toolbar(opsMenu);
  fileOpsMenu.render(d3.select('#fileOpsMenu'));
}
window.onload = window.onresize = setup;
