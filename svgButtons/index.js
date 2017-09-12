import * as d3 from 'd3';
// import updateImgColorFilters from '../imgColorFilters/index.js';
import './svgButtons.scss';

function applySvgButtonColors () {
  let levels = ['light', 'medium', 'strong'];
  let interactions = ['', 'Hover', 'Active'];
  let angles = ['', '90'];
  let gradients = levels.reduce((acc, level) => {
    return acc.concat(interactions.reduce((acc2, interaction) => {
      return acc2.concat(angles.map(angle => {
        return {
          angle,
          level,
          interaction
        };
      }));
    }, []));
  }, []);
  let stopPositions = ['0%', '40%', '100%'];

  let svg = d3.select('body').selectAll('#svgButtonStyles').data([0]);
  let svgEnter = svg.enter().append('svg')
    .attr('id', 'svgButtonStyles');
  svg = svgEnter.merge(svg);

  svgEnter.append('defs');
  let linearGradients = svg.select('defs').selectAll('linearGradient').data(gradients);
  let linearGradientsEnter = linearGradients.enter().append('linearGradient');
  linearGradients = linearGradientsEnter.merge(linearGradients);

  linearGradients.attr('id', function (d) {
    return d.level + d.interaction + 'Gradient' + d.angle;
  }).attr('x1', d => d.angle ? null : 0)
    .attr('x2', d => d.angle ? null : 0)
    .attr('y1', d => d.angle ? null : 0)
    .attr('y2', d => d.angle ? null : 1);

  let stops = linearGradients.selectAll('stop').data(stopPositions);
  let stopsEnter = stops.enter().append('stop');
  stops = stopsEnter.merge(stops);

  stops.attr('class', (d, i) => 'stop' + (i + 1))
    .attr('offset', d => d);

  // updateImgColorFilters();
}

export default applySvgButtonColors;
