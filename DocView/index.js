import mure from 'mure';

import { View } from 'uki';
import template from './template.html';
import './style.scss';

class DocView extends View {
  constructor (defaultContents) {
    super();

    this.defaultBlob = new window.Blob([defaultContents], { type: 'image/svg+xml' });
  }

  setup (d3el) {
    d3el.html(template);
    d3el.select('iframe').on('load', () => { this.resizeIFrame(d3el); });

    mure.on('fileChange', mureFile => { this.renderFile(d3el, mureFile ? mureFile.fileName : null); });
  }

  draw (d3el) {
    // TODO: show a spinner
    mure.getCurrentFilename().then(filename => { this.renderFile(d3el, filename); });
  }

  resizeIFrame (d3el) {
    let iframe = d3el.select('iframe');
    // CSS doesn't let us resize the iframe...
    let previewBounds = d3el.node().getBoundingClientRect();
    let iframeContent = iframe.node().contentDocument.documentElement;
    let bounds = previewBounds;
    if (iframeContent) {
      // First try to get width / height from the SVG tag's attributes
      bounds = {
        width: iframeContent.getAttribute('width'),
        height: iframeContent.getAttribute('height')
      };
      if (bounds.width === null || bounds.height === null) {
        // Next, try using the viewBox attribute
        let viewBox = iframeContent.getAttribute('viewBox');
        if (viewBox) {
          viewBox = viewBox.split(/\s/);
          bounds = {
            width: parseInt(viewBox[2]),
            height: parseInt(viewBox[3])
          };
        }
        if (isNaN(bounds.width) || isNaN(bounds.height)) {
          // Finally, just resort to however large the browser renders it natively
          bounds = iframeContent.getBoundingClientRect();
        }
      }
    }
    iframe.attr('width', bounds.width)
      .attr('height', bounds.height);
    // TODO: It's possible that bounds.width / bounds.height were something other than pixels,
    // e.g. '8.5in'... but the browser doesn't seem to size this correctly:
    bounds = iframeContent.getBoundingClientRect();
    let leftRightMargin = bounds.width < previewBounds.width ? 'auto' : null;
    let topBottomMargin = bounds.height < previewBounds.height ? 'auto' : null;
    iframe.style('margin-left', leftRightMargin)
      .style('margin-right', leftRightMargin)
      .style('margin-top', topBottomMargin)
      .style('margin-bottom', topBottomMargin);
  }

  renderFile (d3el, filename) {
    let blobPromise;
    if (filename) {
      blobPromise = mure.getFileBlob(filename);
    } else {
      blobPromise = Promise.resolve(this.defaultBlob);
    }
    blobPromise.then(blob => {
      let iframe = d3el.select('iframe');
      iframe.attr('src', window.URL.createObjectURL(blob));
      iframe.node().focus();
    });
  }
}

export default DocView;
