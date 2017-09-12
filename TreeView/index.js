import * as d3 from 'd3';
import mure from 'mure';
import applySvgButtonColors from '../svgButtons/index.js';
import debounce from 'debounce';
import { View } from 'uki';
import template from './template.html';
import './style.scss';

class TreeView extends View {
  constructor () {
    super();

    this.requireProperties(['getChildren', 'isLeaf', 'drawNode']);

    this.nextRowId = 0;
    this.initRows().catch(err => { throw err; });

    this.expandedIndex = null;

    mure.on('fileChange', () => {
      (async () => {
        await this.initRows();
        this.render();
      })().catch(this.catchDbError);
    });
    mure.on('fileSave', () => {
      this.render();
    });
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
    this.rows = (await this.getChildren(null)).map(node => {
      return this.createRow(node);
    });
    return this.rows;
  }

  parentIndex (index) {
    let row = this.rows[index];
    let testIndex = index - 1;
    while (testIndex >= 0 && this.rows[testIndex].depth >= row.depth) {
      testIndex -= 1;
    }
    return testIndex;
  }

  async expand (index) {
    let row = this.rows[index];
    if (row.numVisibleDescendants > 0) {
      throw new Error('Row already expanded');
    }
    let nodesToAdd = (await this.getChildren(row.node)).map(node => {
      return this.createRow(node, row.depth + 1);
    });
    this.rows = this.rows.slice(0, index + 1)
      .concat(nodesToAdd)
      .concat(this.rows.slice(index + 1));
    let indexToIncrement = index;
    while (indexToIncrement >= 0) {
      this.rows[indexToIncrement].numVisibleDescendants += nodesToAdd.length;
      indexToIncrement = this.parentIndex(indexToIncrement);
    }
    this.expandedIndex = index;
    this.render();
    return nodesToAdd;
  }

  async collapse (index) {
    let row = this.rows[index];
    let descendantCount = row.numVisibleDescendants;
    let removedDescendants = this.rows.splice(index + 1, descendantCount);
    let indexToDecrement = index;
    while (indexToDecrement >= 0) {
      this.rows[indexToDecrement].numVisibleDescendants -= descendantCount;
      indexToDecrement = this.parentIndex(indexToDecrement);
    }
    this.expandedIndex = index;
    this.render();
    return Promise.resolve(removedDescendants);
  }

  indexToDomNode (d3el, index) {
    return d3el.select('.hierarchyContainer')
      .select('.node:nth-child(n+' + (index + 2) + ')').node(); // nth-child counts from 1 instead of 0
  }

  getVisibleRows (d3el) {
    d3el = d3el || this.d3el;
    if (!this.rows) {
      return [];
    }
    let container = d3el.select('.hierarchyContainer').node();
    let containerBounds = container.getBoundingClientRect();
    this.lastScrollTop = this.scrollTop;
    this.scrollTop = container.scrollTop;
    let firstIndex = Math.floor(this.scrollTop / this.rowSize);
    firstIndex = Math.max(Math.min(firstIndex, this.rows.length), 0);
    let lastIndex = Math.ceil((this.scrollTop + containerBounds.height) / this.rowSize);
    lastIndex = Math.max(Math.min(lastIndex, this.rows.length), firstIndex);

    let offset = 0;
    let firstNode = this.indexToDomNode(d3el, firstIndex);
    if (firstNode) {
      offset = firstNode.getBoundingClientRect().top - containerBounds.top;
    }

    let startY, endY;
    if (this.expandedIndex !== null) {
      // we just expanded / collapsed a node, so the parent index is where we want
      // nodes to start from / go to
      startY = endY = offset + (this.expandedIndex - firstIndex) * this.rowSize;
    } else {
      // we just scrolled...
      let scrolledDown = true;
      if (this.lastScrollTop !== undefined) {
        scrolledDown = this.scrollTop - this.lastScrollTop >= 0;
      }
      let top = -this.rowSize;
      let bottom = containerBounds.bottom + this.rowSize;
      if (scrolledDown) {
        startY = bottom;
        endY = top;
      } else {
        startY = top;
        endY = bottom;
      }
    }

    return new Array(lastIndex - firstIndex).fill().map((d, i) => {
      return {
        visibleIndex: i,
        actualIndex: i + firstIndex,
        row: this.rows[i + firstIndex],
        y: offset + i * this.rowSize,
        startY,
        endY
      };
    });
  }

  setup (d3el) {
    d3el.html(template);

    // We set this here and use a distinct variable so it's easy for subclasses
    // to adjust the row size
    this.rowSize = 1.5 * this.emSize;

    d3el.select('.hierarchyContainer').on('scroll', debounce(() => {
      this.expandedIndex = null;
      this.drawIndicators(d3el, this.getVisibleRows(d3el));
      if (this.relay) {
        this.relay.trigger('changeVisibleIndicators');
      }
    }), 10000);
    d3el.append('div').classed('indicatorContainer', true)
      .append('svg').classed('indicators', true);

    applySvgButtonColors();
  }

  draw (d3el) {
    let self = this;
    if (!this.rows) {
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
    let nodes = svg.selectAll('.node').data(this.rows, d => d.id);
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

    let containerBounds = d3el.select('.hierarchyContainer').node().getBoundingClientRect();
    bounds = {
      width: Math.max(bounds.width, containerBounds.width - this.scrollBarSize - 2),
      height: Math.max(bounds.height, containerBounds.height - this.scrollBarSize)
    };

    // Now we know how to size the background
    nodes.select('.background')
      .attr('width', bounds.width - 2)
      .attr('height', this.rowSize - 2)
      .attr('transform', d => {
        return 'translate(' + (-(d.depth + 1.5) * this.rowSize + 2) + ', ' + (-this.rowSize / 2 + 1) + ')';
      });

    // Hide and then remove the exiting nodes
    nodesExit
      .attr('opacity', 1)
      .transition(t)
      .attr('opacity', 0)
      .remove();

    // Draw the arrows and rotate them
    let arrowRadius = this.rowSize / 3;
    nodesEnter.append('g')
      .classed('arrow', true)
      .classed('button', true)
      .attr('transform', 'translate(-' + arrowRadius * 2 + ') rotate(0)')
      .append('path')
        .classed('background', true)
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

    // Draw the indicator section and dots
    this.drawIndicators(d3el, this.getVisibleRows(d3el), t3);
  }
  drawIndicators (d3el, indices, t) {
    let self = this;
    t = t || d3.transition()
      .duration(500);

    let containerBounds = d3el.select('.indicatorContainer')
      .node().getBoundingClientRect();
    let svg = d3el.select('svg.indicators')
      .attr('width', containerBounds.width)
      .attr('height', containerBounds.height);

    let indicators = svg.selectAll('.indicator').data(indices, d => d.row.id);
    indicators.exit()
      .transition(t)
      .attr('transform', d => {
        return 'translate(' + (this.emSize / 2) + ',' + (d.endY + this.rowSize / 2) + ')';
      })
      .attr('opacity', 0)
      .remove();
    let indicatorsEnter = indicators.enter().append('g')
      .classed('indicator', true)
      .attr('transform', d => {
        return 'translate(' + (this.emSize / 2) + ',' + (d.startY + this.rowSize / 2) + ')';
      })
      .attr('opacity', 0);
    indicators = indicatorsEnter.merge(indicators);

    indicators.each(function (d) {
      self.drawIndicator(d3.select(this), d.row);
    }).transition(t)
      .attr('transform', d => 'translate(' +
        (this.emSize / 2) + ',' + (d.y + this.rowSize / 2) + ')')
      .attr('opacity', 1);
  }
  drawIndicator (d3el, row) {
    // This is a stub; by default the indicator group is hidden
  }
}

export default TreeView;
