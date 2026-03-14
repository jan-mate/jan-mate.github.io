window.VineApp = (function() {
    let canvas, ctx, width, height;
    let leafImg = new Image();
    let config = { seed: 888, attractors: 1780, attractDist: 346, killDist: 56, segmentLen: 12, noiseAmt: 400, growthRate: 11 };
    let currentSeed, nodes = [], allLeaves =[], thicknessBatches = {}, globalMaxDist = 0;
    let currentProgress = 0;

    function random() {
        currentSeed = (currentSeed * 16807) % 2147483647;
        return (currentSeed - 1) / 2147483646;
    }

    function init() {
        canvas = document.getElementById('vineCanvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d', { alpha: false });
        leafImg.src = 'hedera_helix.svg';
        
        leafImg.onload = () => draw(currentProgress);
        window.addEventListener('resize', resize);
        resize();
    }

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        generateTree();
        draw(currentProgress);
    }

    function generateTree() {
        currentSeed = config.seed;
        let attractorsArr = [];
        nodes =[];
        allLeaves =[];
        thicknessBatches = {};
        globalMaxDist = 0;
        let margin = 50;

        for (let i = 0; i < config.attractors; i++) {
            let x = random() * width;
            let y = random() * height;
            if (x < margin && y > 100) continue;
            if (x > width - margin) continue;
            if (y < margin && x > 100) continue;
            if (y > height - margin) continue;
            if (x > width * 0.5 && y > height * 0.5) continue;
            let dx = x - 0;
            let dy = y - height;
            if (Math.sqrt(dx*dx + dy*dy) < 300) continue;
            attractorsArr.push({ x, y, reached: false });
        }

        nodes.push({ x: 0, y: 0, parent: null, children:[], dist: 0, thickness: 1, dirX: 0.5, dirY: 0.5, attractCount: 0 });

        let active = true;
        let iterations = 0;

        while (active && iterations < 3000) {
            active = false;
            iterations++;
            nodes.forEach(n => { n.avgDirX = 0; n.avgDirY = 0; n.attractCount = 0; });
            attractorsArr.forEach(a => {
                if (a.reached) return;
                let minDist = config.attractDist;
                let closest = null;
                nodes.forEach(n => {
                    let dx = a.x - n.x, dy = a.y - n.y;
                    let d = Math.sqrt(dx * dx + dy * dy);
                    if (d < minDist) { minDist = d; closest = n; }
                });
                if (closest) {
                    if (minDist < config.killDist) a.reached = true;
                    else {
                        closest.avgDirX += (a.x - closest.x) / minDist;
                        closest.avgDirY += (a.y - closest.y) / minDist;
                        closest.attractCount++;
                    }
                }
            });
            let newNodes =[];
            nodes.forEach(n => {
                if (n.attractCount > 0) {
                    let len = Math.sqrt(n.avgDirX * n.avgDirX + n.avgDirY * n.avgDirY);
                    let dx = n.avgDirX / len;
                    let dy = n.avgDirY / len;
                    let momentum = 0.6;
                    dx = dx * (1 - momentum) + n.dirX * momentum;
                    dy = dy * (1 - momentum) + n.dirY * momentum;
                    let nLen = Math.sqrt(dx * dx + dy * dy);
                    dx /= nLen; dy /= nLen;
                    let noise = config.noiseAmt / 300;
                    dx += (random() - 0.5) * noise;
                    dy += (random() - 0.5) * noise;
                    nLen = Math.sqrt(dx * dx + dy * dy);
                    dx /= nLen; dy /= nLen;
                    let newNode = {
                        x: n.x + dx * config.segmentLen,
                        y: n.y + dy * config.segmentLen,
                        parent: n,
                        children:[],
                        dist: n.dist + config.segmentLen,
                        thickness: 1,
                        dirX: dx, dirY: dy
                    };
                    if (newNode.dist > globalMaxDist) globalMaxDist = newNode.dist;
                    n.children.push(newNode);
                    newNodes.push(newNode);
                    active = true;
                }
            });
            nodes.push(...newNodes);
        }

        let sortedNodes = [...nodes].sort((a, b) => b.dist - a.dist);
        sortedNodes.forEach(n => {
            if (n.children.length > 0) {
                let area = n.children.reduce((sum, c) => sum + Math.pow(c.thickness, 2.2), 0);
                n.thickness = Math.pow(area, 1/2.2);
            } else { n.thickness = 1; }
            
            let tKey = Math.round(n.thickness * 10) / 10;
            if (!thicknessBatches[tKey]) thicknessBatches[tKey] = [];
            thicknessBatches[tKey].push(n);
        });

        let leafSideToggle = 1;
        nodes.forEach(n => {
            if (!n.parent) return;
            let isTip = n.children.length === 0;
            let shouldSpawn = random() < 0.08; 
            if (isTip) shouldSpawn = true;
            if (shouldSpawn) {
                let baseAngle = Math.atan2(n.dirY, n.dirX);
                let petioleAngle;
                if (isTip) { petioleAngle = baseAngle; } 
                else {
                    leafSideToggle *= -1;
                    petioleAngle = baseAngle + (Math.PI * 0.45) * leafSideToggle + (random() - 0.5) * 0.3;
                }
                let petioleLen = 14 + random() * 18;
                let lx = n.x + Math.cos(petioleAngle) * petioleLen;
                let ly = n.y + Math.sin(petioleAngle) * petioleLen;
                let size = (30 + Math.min(n.thickness * 3, 25) + random() * 10) * 1.2;
                let finalAngle = petioleAngle + Math.PI/2;
                allLeaves.push({ 
                    x: lx, y: ly, rootX: n.x, rootY: n.y, angle: finalAngle,
                    cos: Math.cos(finalAngle), sin: Math.sin(finalAngle),
                    dist: n.dist, size: size 
                });
            }
        });
    }

    function draw(progress) {
        currentProgress = progress;
        if (!ctx) return;
        ctx.setTransform(1, 0, 0, 1, 0, 0); 
        ctx.clearRect(0, 0, width, height);

        const targetDist = Math.min(globalMaxDist, progress * (config.growthRate / 10) * globalMaxDist);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 0; 
        ctx.strokeStyle = '#fff';

        const thicknessKeys = Object.keys(thicknessBatches).sort((a,b) => b - a);
        for (let k of thicknessKeys) {
            const batch = thicknessBatches[k];
            ctx.lineWidth = Math.min(parseFloat(k) * 2.8, 55);
            ctx.beginPath();
            let hasPath = false;
            for (let i = 0; i < batch.length; i++) {
                let n = batch[i];
                if (n.parent && n.dist <= targetDist) {
                    ctx.moveTo(n.parent.x, n.parent.y);
                    ctx.lineTo(n.x, n.y);
                    hasPath = true;
                }
            }
            if (hasPath) ctx.stroke();
        }

        let visibleLeaves =[];
        for (let i = 0; i < allLeaves.length; i++) {
            if (allLeaves[i].dist <= targetDist) visibleLeaves.push(allLeaves[i]);
        }

        if (visibleLeaves.length > 0 && leafImg.complete) {
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 20;

            for (let i = 0; i < visibleLeaves.length; i++) {
                let l = visibleLeaves[i];
                let scale = Math.min(1, (targetDist - l.dist) * 0.01);
                if (scale > 0.1) {
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(l.rootX, l.rootY);
                    ctx.lineTo(l.x, l.y);
                    ctx.stroke();

                    ctx.setTransform(scale * l.cos, scale * l.sin, -scale * l.sin, scale * l.cos, l.x, l.y);
                    ctx.drawImage(leafImg, -l.size/2, -l.size, l.size, l.size);
                }
            }
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    return { init, draw };
})();