import * as d3 from 'd3';
import { View } from 'uki';
import template from './template.html';
import './style.scss';

class TreeView extends View {
  constructor (relay) {
    super();
    this.relay = relay;

    this.requireProperties(['getChildren', 'isLeaf', 'drawNode']);

    this.nextRowId = 0;
    this.initRows().catch(err => { throw err; });
  }

  createRow (node, depth) {
    this.nextRowId += 1;
    return {
      node,
      id: this.nextRowId,
      depth: depth || 0,
      isLeaf: this.isLeaf(node),
      numVisibleDescendants: 0
    };
  }

  async initRows () {
    this.nodes = (await this.getChildren(null)).map(node => {
      return this.createRow(node);
    });
    return this.nodes;
  }

  parentIndex (index) {
    let row = this.nodes[index];
    let testIndex = index - 1;
    while (testIndex >= 0 && this.nodes[testIndex].depth >= row.depth) {
      testIndex -= 1;
    }
    return testIndex;
  }

  async expand (index) {
    let row = this.nodes[index];
    if (row.numVisibleDescendants > 0) {
      throw new Error('Row already expanded');
    }
    let nodesToAdd = (await this.getChildren(row.node)).map(node => {
      return this.createRow(node, row.depth + 1);
    });
    this.nodes = this.nodes.slice(0, index + 1)
      .concat(nodesToAdd)
      .concat(this.nodes.slice(index + 1));
    let indexToIncrement = index;
    while (indexToIncrement >= 0) {
      this.nodes[indexToIncrement].numVisibleDescendants += nodesToAdd.length;
      indexToIncrement = this.parentIndex(indexToIncrement);
    }
    this.render();
    return nodesToAdd;
  }

  async collapse (index) {
    let row = this.nodes[index];
    let descendantCount = row.numVisibleDescendants;
    let removedDescendants = this.nodes.splice(index + 1, descendantCount);
    let indexToDecrement = index;
    while (indexToDecrement >= 0) {
      this.nodes[indexToDecrement].numVisibleDescendants -= descendantCount;
      indexToDecrement = this.parentIndex(indexToDecrement);
    }
    this.render();
    return Promise.resolve(removedDescendants);
  }

  getVisibleRows (d3el) {
    let containerBounds = d3el.node().getBoundingClientRect();
    let containerScrollTop = d3el.node().scrollTop;
    let svg = d3el.select('svg.hierarchy');
    let aRow = svg.select('.node').node();
    if (!aRow) {
      return [];
    }
    let rowBounds = aRow.getBoundingClientRect();
    let firstIndex = Math.floor(containerScrollTop / rowBounds.height);
    firstIndex = Math.min(Math.max(0, firstIndex), this.nodes.length);
    let lastIndex = Math.ceil((containerScrollTop + containerBounds.height) / rowBounds.height);
    lastIndex = Math.min(Math.max(0, lastIndex), this.nodes.length);

    let rows = [];
    let selector = '.node:nth-child(n+' + (firstIndex + 1) + '):nth-child(-n+' + (lastIndex + 1) + ')';
    d3.selectAll(selector).each(function (d, i) {
      rows.push({
        index: i,
        y: this.getBoundingClientRect().top - containerBounds.top
      });
    });
    return rows;
  }

  setup (d3el) {
    d3el.html(template);

    // We set this here and use a distinct variable so it's easy for subclasses
    // to adjust the row size
    this.rowSize = 1.5 * this.emSize;
  }

  draw (d3el) {
    let self = this;
    if (!this.nodes) {
      // draw got called before initRows; try again after a timeout
      window.setTimeout(() => { this.render(); }, 100);
      return;
    }
    // First animation phase: fade exiting nodes out, rotate the arrow
    let t = d3.transition()
      .duration(500);
    // Second animation phase: move the rows into place
    let t2 = t.transition()
      .duration(500);
    // Third animation phase: fade in new nodes
    let t3 = t2.transition()
      .duration(500);

    // Initial setup of selections
    let svg = d3el.select('svg.hierarchy');
    let nodes = svg.selectAll('.node').data(this.nodes, d => d.id);
    let nodesExit = nodes.exit();
    let nodesEnter = nodes.enter().append('g').classed('node', true);
    nodes = nodesEnter.merge(nodes);

    // Draw the background of each row... but we need to know the width before we can size it
    nodesEnter.append('rect').classed('background', true);

    // Call the subclass draw functions and figure out how much space we need
    nodesEnter.append('g').classed('content', true);

    let bounds = {
      width: 0,
      height: 0
    };
    nodes.each(function (d) {
      let indent = (1.5 + d.depth) * self.rowSize;
      let rowWidth = self.drawNode(d3.select(this).select('.content'), d.node, indent);
      bounds.width = Math.max(bounds.width, rowWidth);
    });
    bounds.height = (nodes.size()) * this.rowSize;

    let containerBounds = d3el.node().getBoundingClientRect();
    bounds = {
      width: Math.max(bounds.width, containerBounds.width - this.scrollBarSize - 2),
      height: Math.max(bounds.height, containerBounds.height - this.scrollBarSize)
    };

    // Now we know how to size the background
    nodes.select('.background')
      .attr('width', bounds.width)
      .attr('height', this.rowSize - 2)
      .attr('transform', d => {
        return 'translate(' + (-(d.depth + 1.5) * this.rowSize) + ', ' + (-this.rowSize / 2 + 1) + ')';
      });

    // Hide and then remove the exiting nodes
    nodesExit
      .attr('opacity', 1)
      .transition(t)
      .attr('opacity', 0)
      .remove();

    // Draw the arrows and rotate them
    let arrowRadius = this.rowSize / 3;
    nodesEnter.append('path')
      .classed('arrow', true)
      .attr('transform', 'translate(-' + arrowRadius * 2 + ') rotate(0)')
      .attr('d', 'M-' + arrowRadius + ',-' + arrowRadius +
                 'Q' + (1.5 * arrowRadius) + ',0,' +
                 '-' + arrowRadius + ',' + arrowRadius + 'Z');
    nodes.select('.arrow')
      .style('display', d => this.isLeaf(d.node) ? 'none' : null)
      .on('click', (d, i) => {
        // TODO: This is an incredibly stupid bug that's out of my hands until
        // webpack figures out WTF they're doing with esnext vs jsnext:main vs whatever,
        // or if Mike Bostock decides to change the d3 API such that the imported event
        // object no longer needs to be mutable...
        // See this issue: https://github.com/d3/d3-selection/pull/125
        // as well as this issue: https://github.com/webpack/webpack/issues/1979
        // TL;DR: try d3.event instead of window.d3.event at some point in the future?
        window.d3.event.stopPropagation();
        if (!this.isLeaf(d.node)) {
          if (d.numVisibleDescendants > 0) {
            this.collapse(i).catch(err => { throw err; });
          } else {
            this.expand(i).catch(err => { throw err; });
          }
        }
      })
      .transition(t)
      .attr('transform', d => {
        if (d.numVisibleDescendants === 0) {
          return 'translate(-' + arrowRadius * 2 + ') rotate(0)';
        } else {
          return 'translate(-' + arrowRadius * 2 + ') rotate(90)';
        }
      });

    // Move the rows into place and adjust the SVG size accordingly
    nodes.transition(t2)
      .attr('transform', (d, i) => {
        return 'translate(' + ((d.depth + 1.5) * this.rowSize) + ',' + ((i + 0.5) * this.rowSize) + ')';
      });
    svg.transition(t2)
      .attr('width', bounds.width)
      .attr('height', bounds.height);

    // Initialize and fade in new rows
    nodesEnter
      .attr('transform', (d, i) => {
        return 'translate(' + ((d.depth + 1.5) * this.rowSize) + ',' + ((i + 0.5) * this.rowSize) + ')';
      })
      .attr('opacity', 0)
      .transition(t3)
      .attr('opacity', 1);
  }
}

export default TreeView;
