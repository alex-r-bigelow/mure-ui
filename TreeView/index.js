import * as d3 from 'd3';
import { View } from 'uki';
import template from './template.html';
import './style.scss';

class TreeView extends View {
  constructor () {
    super();

    this.requireProperties(['getChildren', 'isLeaf', 'drawNode']);

    this.nextRowId = 0;
    this.initVisibleNodes().catch(err => { throw err; });
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

  async initVisibleNodes () {
    this.visibleNodes = (await this.getChildren(null)).map(node => {
      return this.createRow(node);
    });
    return this.visibleNodes;
  }

  parentIndex (index) {
    let row = this.visibleNodes[index];
    let testIndex = index - 1;
    while (testIndex >= 0 && this.visibleNodes[testIndex].depth >= row.depth) {
      testIndex -= 1;
    }
    return testIndex;
  }

  async expand (index) {
    let row = this.visibleNodes[index];
    if (row.numVisibleDescendants > 0) {
      throw new Error('Row already expanded');
    }
    let nodesToAdd = (await this.getChildren(row.node)).map(node => {
      return this.createRow(node, row.depth + 1);
    });
    this.visibleNodes = this.visibleNodes.slice(0, index + 1)
      .concat(nodesToAdd)
      .concat(this.visibleNodes.slice(index + 1));
    let indexToIncrement = index;
    while (indexToIncrement >= 0) {
      this.visibleNodes[indexToIncrement].numVisibleDescendants += nodesToAdd.length;
      indexToIncrement = this.parentIndex(indexToIncrement);
    }
    this.render();
    return nodesToAdd;
  }

  async collapse (index) {
    let row = this.visibleNodes[index];
    let descendantCount = row.numVisibleDescendants;
    let removedDescendants = this.visibleNodes.splice(index + 1, descendantCount);
    let indexToDecrement = index;
    while (indexToDecrement >= 0) {
      this.visibleNodes[indexToDecrement].numVisibleDescendants -= descendantCount;
      indexToDecrement = this.parentIndex(indexToDecrement);
    }
    this.render();
    return Promise.resolve(removedDescendants);
  }

  setup (d3el) {
    d3el.html(template);

    // We set this here and use a distinct variable so it's easy for subclasses
    // to adjust the row size
    this.rowSize = 1.5 * this.emSize;
  }

  draw (d3el) {
    if (!this.visibleNodes) {
      // draw got called before initVisibleNodes; try again after a timeout
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
    let svg = d3el.select('svg');
    let nodes = svg.selectAll('.node').data(this.visibleNodes, d => d.id);
    let nodesExit = nodes.exit();
    let nodesEnter = nodes.enter().append('g').classed('node', true);
    nodes = nodesEnter.merge(nodes);

    // Call the subclass draw functions and figure out how much space we need
    nodesEnter.append('g').classed('content', true);
    let self = this;
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
    let containerBounds = d3el.node().getBoundingClientRect();
    bounds = {
      width: Math.max(bounds.width, containerBounds.width - this.scrollBarSize),
      height: Math.max(bounds.height, containerBounds.height - this.scrollBarSize)
    };
    svg.transition(t2)
      .attr('width', bounds.width)
      .attr('height', bounds.height);

    // Draw the lines at the bottom of each row now that we know the width
    nodesEnter.append('path').classed('underline', true);
    nodes.select('.underline')
      .attr('d', 'M0,0L' + bounds.width + ',0')
      .attr('transform', d => {
        return 'translate(-' + (d.depth + 1.5) * this.rowSize + ', ' + (this.rowSize / 2) + ')';
      });

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
