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
  constructor (extension, options, okCallback) {
    super();
    this.extension = extension;
    // options is an array of { label: '', attrs: {} } objects;
    // attrs sets each <input> fields' attributes, and id is required
    this.options = options;
    this.okCallback = okCallback;
  }
  draw (d3el) {
    d3el.select('.modalBorder')
      .style('width', '24em')
      .style('height', '18em')
      .style('left', 'calc(50% - 12em)')
      .style('top', 'calc(50% - 9em)');

    let modal = d3el.select('.modal');
    modal.html(newFileDialogTemplate);

    d3el.select('#extension').text(this.extension);
    d3el.select('#extensionHeader').text(this.extension.trim('.').toUpperCase());

    let options = d3el.select('.formContainer').selectAll('.option')
      .data(this.options);
    options.exit().remove();
    let optionsEnter = options.enter().append('div')
      .classed('option', true);
    options = options.merge(optionsEnter);

    optionsEnter.append('label');
    options.select('label')
      .attr('for', d => d.attrs.id)
      .text(d => d.label || '');

    optionsEnter.append('input');
    options.select('input')
      .each(function (d) {
        let inputEl = d3.select(this);
        Object.keys(d.attrs).forEach(attr => {
          inputEl.attr(attr, d.attrs[attr]);
        });
      });

    d3el.select('#okButton').on('click', () => {
      let callbackObj = {
        name: d3el.select('#filename').node().value + this.extension
      };
      this.options.forEach(option => {
        callbackObj[option.attrs.id] = d3el.select('#' + option.attrs.id).node().value;
      });
      this.okCallback(callbackObj);
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
