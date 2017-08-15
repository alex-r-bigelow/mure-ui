import * as d3 from 'd3';
import { View } from 'uki';

import newFileDialogTemplate from './newFileDialog.html';

import './style.scss';

class Dialog extends View {
  constructor () {
    super();
    this.d3el = d3.select('body');
    this.dirty = true;
  }
  setup (d3el) {
    d3el.append('div')
      .classed('modalUnderlay', true);
    d3el.append('div')
      .classed('modalContainer', true)
      .append('div')
      .classed('modalBorder', true)
      .append('div')
      .classed('modal', true);
  }
  close (d3el) {
    d3el.selectAll('.modalUnderlay, .modalContainer').remove();
  }
}

class NewFileDialog extends Dialog {
  constructor (okCallback) {
    super();
    this.okCallback = okCallback;
  }
  draw (d3el) {
    d3el.style('width', '24em')
      .style('height', '18em')
      .style('left', 'calc(50% - 12em)')
      .style('top', 'calc(50% - 9em)');

    let modal = d3el.select('.modal');
    modal.html(newFileDialogTemplate);

    let unitOptions = modal.selectAll('.units').selectAll('option')
      .data(NewFileDialog.UNITS);
    unitOptions.enter().append('option')
      .attr('value', d => d)
      .property('selected', d => d === 'px')
      .text(d => d);

    d3el.select('#okButton').on('click', () => {
      this.okCallback({
        name: d3el.select('#filename').node().value,
        width: d3el.select('#width').node().value, // + d3el.select('#widthUnit').node().value,
        height: d3el.select('#height').node().value // + d3el.select('#heightUnit').node().value
      });
      this.close(d3el);
    });
    d3el.select('#cancelButton').on('click', () => {
      this.close(d3el);
    });
  }
}

NewFileDialog.UNITS = [
  'px',
  'em',
  'ex',
  'pt',
  'pc',
  'cm',
  'mm',
  'in'];

export { NewFileDialog };
