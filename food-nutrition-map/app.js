async function init() {
  const data = await d3.json('data.json');
  const foods = data.foods;
  const categoryColors = data.categoryColors;
  const nutrientsSchema = data.nutrients;

  const svg = d3.select('#plot');
  const tooltip = d3.select('#tooltip');
  const detailPanel = d3.select('#detail-panel');
  const detailBody = d3.select('#detail-body');
  const searchInput = d3.select('#search');
  let selectedElement = null;
  const resetButton = d3.select('#reset');

  let width = svg.node().clientWidth;
  let height = svg.node().clientHeight;

  const isMobile = window.innerWidth <= 640 || window.matchMedia('(pointer: coarse)').matches;
  const baseRadius = isMobile ? 4.25 : 4.75;

  // Handle Resize
  function updateDimensions() {
    width = svg.node().clientWidth;
    height = svg.node().clientHeight;
    
    xScale.range([0, width]);
    yScale.range([height, 0]);
  }

  // Scales
  const xExtent = d3.extent(foods, d => d.x);
  const yExtent = d3.extent(foods, d => d.y);
  
  // Add 10% padding to ensure points don't clip at edges
  const xPadding = (xExtent[1] - xExtent[0]) * 0.1;
  const yPadding = (yExtent[1] - yExtent[0]) * 0.1;
  
  const xDomain = [xExtent[0] - xPadding, xExtent[1] + xPadding];
  const yDomain = [yExtent[0] - yPadding, yExtent[1] + yPadding];

  // We want to map domain to range, but preserve aspect ratio of the data
  // so a unit of x is visually the same size as a unit of y.
  const dx = xDomain[1] - xDomain[0];
  const dy = yDomain[1] - yDomain[0];
  
  // Calculate the aspect ratio of the data and the screen
  const dataAspect = dx / dy;
  const screenAspect = width / height;
  
  let finalXDomain = [...xDomain];
  let finalYDomain = [...yDomain];
  
  // Adjust domains to match screen aspect ratio to prevent stretching and clipping
  if (dataAspect > screenAspect) {
    // Data is wider than screen: expand Y domain to match screen aspect
    const targetDy = dx / screenAspect;
    const yCenter = (yDomain[0] + yDomain[1]) / 2;
    finalYDomain = [yCenter - targetDy / 2, yCenter + targetDy / 2];
  } else {
    // Screen is wider than data: expand X domain to match screen aspect
    const targetDx = dy * screenAspect;
    const xCenter = (xDomain[0] + xDomain[1]) / 2;
    finalXDomain = [xCenter - targetDx / 2, xCenter + targetDx / 2];
  }

  const xScale = d3.scaleLinear().domain(finalXDomain).range([0, width]);
  const yScale = d3.scaleLinear().domain(finalYDomain).range([height, 0]);

  // Now zoom identity perfectly frames the data without distortion
  function getInitialTransform() {
    return d3.zoomIdentity;
  }

  const zoomG = svg.append('g').attr('class', 'zoomable labels-off');

  // Background click to deselect
  svg.on('click', (event) => {
    if (event.target === svg.node()) {
      closeDetailPanel();
    }
  });

  // Draw circles
  const circles = zoomG.selectAll('.food-circle')
    .data(foods)
    .join('circle')
    .attr('class', 'food-circle')
    .attr('cx', d => xScale(d.x))
    .attr('cy', d => yScale(d.y))
    .attr('r', baseRadius)
    .attr('fill', d => categoryColors[d.category] || '#fff')
    .on('mouseover', showTooltip)
    .on('mousemove', moveTooltip)
    .on('mouseout', hideTooltip)
    .on('click', (event, d) => {
      event.stopPropagation();
      showDetail(d, event.currentTarget);
    });

  // Draw labels (hidden by default via CSS)
  const labels = zoomG.selectAll('.food-label')
    .data(foods)
    .join('text')
    .attr('class', 'food-label')
    .attr('x', d => xScale(d.x))
    .attr('y', d => yScale(d.y))
    .attr('dy', -10)
    .text(d => d.name)
    .on('mouseover', showTooltip)
    .on('mousemove', moveTooltip)
    .on('mouseout', hideTooltip)
    .on('click', (event, d) => {
      event.stopPropagation();
      // Find the corresponding circle element to highlight
      const idx = foods.indexOf(d);
      const circleNode = circles.nodes()[idx];
      showDetail(d, circleNode);
    });

  // Zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([0.5, 400])
    .on('zoom', (event) => {
      const { transform } = event;
      zoomG.attr('transform', transform);

      // Label visibility logic
      const currentDomainWidth = (width / transform.k) * ((xScale.domain()[1] - xScale.domain()[0]) / width);
      const isMobile = window.innerWidth <= 640;
      const threshold = isMobile ? 1.0 : 4.5;
      
      if (currentDomainWidth < threshold) {
        zoomG.classed('labels-on', true).classed('labels-off', false);
        labels.style('font-size', (14 / transform.k) + 'px');
        labels.attr('dy', -10 / transform.k);
      } else {
        zoomG.classed('labels-on', false).classed('labels-off', true);
      }
      
      // Counter-scale circles so they stay same size on screen
      circles.attr('r', baseRadius / transform.k);
    });

  svg.call(zoom).on("dblclick.zoom", null);
  
  // Set the initial zoom state so circle counter-scaling triggers immediately
  svg.call(zoom.transform, getInitialTransform());

  // Tooltip functions
  function showTooltip(event, d) {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    
    tooltip.classed('hidden', false)
      .html(`<strong>${d.full_name}</strong><br/><span style="color:#888">${d.category}</span>`);
  }

  function moveTooltip(event) {
    tooltip.style('left', (event.clientX + 15) + 'px')
      .style('top', (event.clientY + 15) + 'px');
  }

  function hideTooltip() {
    tooltip.classed('hidden', true);
  }

  // Detail Panel

  function showDetail(d, element) {
    // Selection highlight
    if (selectedElement) {
      d3.select(selectedElement).classed('selected', false);
    }
    selectedElement = element;
    
    d3.select(element).classed('selected', true);
    
    circles.classed('dimmed', true);
    d3.select(element).classed('dimmed', false);

    detailPanel.classed('hidden', false);
    
    // Build content
    let html = `
      <div class="detail-header">
        <div class="detail-name">${d.full_name}</div>
        <div class="detail-category">${d.category}</div>
      </div>
      <div class="detail-divider"></div>
    `;

    const renderSection = (title, keys) => {
      html += `<div class="section-title">${title}</div>`;
      keys.forEach(n => {
        const val = d.values[n.col];
        const dri = d.dri[n.col];
        const valStr = val !== null ? `${val.toFixed(1)}${n.unit}` : '---';
        const driStr = dri !== null ? `${Math.round(dri)}%` : '';
        
        let barColor = '#555';
        if (dri >= 100) barColor = '#2d2';
        else if (dri >= 20) barColor = '#3a3';
        else if (dri >= 5) barColor = '#a83';

        html += `
          <div class="nutrient-row">
            <div class="nutrient-name" title="${n.key}">${n.key}</div>
            <div class="nutrient-value">${valStr}</div>
            <div class="dri-container">
              <div class="dri-bar-bg">
                <div class="dri-bar-fill" style="width: ${Math.min(dri || 0, 100)}%; background: ${barColor}"></div>
              </div>
              <div class="dri-pct">${driStr}</div>
            </div>
          </div>
        `;
      });
    };

    renderSection('Macros', nutrientsSchema.macros);
    renderSection('Vitamins', nutrientsSchema.vitamins);
    renderSection('Minerals', nutrientsSchema.minerals);

    detailBody.html(html);
  }

  function closeDetailPanel() {
    detailPanel.classed('hidden', true);
    circles.classed('dimmed', false);
    if (selectedElement) {
      d3.select(selectedElement).classed('selected', false);
      selectedElement = null;
    }
  }

  d3.select('#detail-close').on('click', closeDetailPanel);

  // Search
  searchInput.on('input', function() {
    const query = this.value.toLowerCase();
    if (!query) {
      circles.classed('hidden-search', false).style('display', null);
      labels.classed('hidden-search', false).style('display', null);
      return;
    }

    foods.forEach((d, i) => {
      const match = d.full_name.toLowerCase().includes(query);
      d3.select(circles.nodes()[i]).style('display', match ? null : 'none');
      d3.select(labels.nodes()[i]).style('display', match ? null : 'none');
    });
  });

  // Reset
  resetButton.on('click', () => {
    svg.transition().duration(250).call(zoom.transform, getInitialTransform());
  });

  // Handle Resize
  window.addEventListener('resize', () => {
    width = svg.node().clientWidth;
    height = svg.node().clientHeight;
    
    const newScreenAspect = width / height;
    let newFinalXDomain = [...xDomain];
    let newFinalYDomain = [...yDomain];
    
    if (dataAspect > newScreenAspect) {
      const targetDy = dx / newScreenAspect;
      const yCenter = (yDomain[0] + yDomain[1]) / 2;
      newFinalYDomain = [yCenter - targetDy / 2, yCenter + targetDy / 2];
    } else {
      const targetDx = dy * newScreenAspect;
      const xCenter = (xDomain[0] + xDomain[1]) / 2;
      newFinalXDomain = [xCenter - targetDx / 2, xCenter + targetDx / 2];
    }

    xScale.domain(newFinalXDomain).range([0, width]);
    yScale.domain(newFinalYDomain).range([height, 0]);
    
    // We must reset the zoom transform because the base scales changed
    svg.call(zoom.transform, getInitialTransform());
    
    circles.attr('cx', d => xScale(d.x)).attr('cy', d => yScale(d.y));
    labels.attr('x', d => xScale(d.x)).attr('y', d => yScale(d.y));
  });
}

init();
