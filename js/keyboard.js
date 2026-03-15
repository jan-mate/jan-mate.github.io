document.addEventListener('DOMContentLoaded', () => {
    const getLogNormalDelay = (mean, std) => {
        const v = (std * std) / (mean * mean);
        const mu = Math.log(mean) - 0.5 * Math.log(1 + v);
        const sigma = Math.sqrt(Math.log(1 + v));
        let u1 = 0, u2 = 0;
        while(u1 === 0) u1 = Math.random();
        while(u2 === 0) u2 = Math.random();
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        return Math.exp(mu + sigma * z0);
    };

    let kbTyped = false;
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    cursor.textContent = '|';

    async function typeNode(parent, text, isLink = false, linkHref = null, isItalic = false) {
        parent.appendChild(cursor); // Ensure cursor is positioned before typing starts

        let target = parent;
        let wrapper = null;

        if (isLink) {
            wrapper = document.createElement('a');
            wrapper.href = linkHref;
            if (linkHref.startsWith('http')) wrapper.target = '_blank';
            parent.insertBefore(wrapper, cursor);
            target = wrapper;
        }

        if (isItalic) {
            const i = document.createElement('i');
            target.appendChild(i);
            target = i;
        }

        let textNode = document.createTextNode('');
        if (wrapper) {
            target.appendChild(textNode);
        } else {
            parent.insertBefore(textNode, cursor); // Keep text explicitly before cursor
        }

        for (let char of text) {
            textNode.nodeValue += char;
            await new Promise(r => setTimeout(r, getLogNormalDelay(60, 40)));
        }
    }

    async function startTypingSequence() {
        const mainEl = document.getElementById('typed-text-main');
        const subEl = document.getElementById('typed-text-sub');
        const imgSubEl = document.getElementById('keyboard-subtext');
        
        if(!mainEl || !subEl || !imgSubEl) return;

        await typeNode(mainEl, "i like to waste my time on keyboard layouts");
        
    
        await typeNode(subEl, "ive made a few keyboard layout related things, see ");
        await typeNode(subEl, "here", true, "/keyboards/");
        
    
        await new Promise(resolve => setTimeout(resolve, 400));
        
        
        await typeNode(imgSubEl, "my layout. see ");
        await typeNode(imgSubEl, "this video", true, "https://youtu.be/2BIkk9FkxcU", false);
        await typeNode(imgSubEl, " for explanation");
        
        
        cursor.remove();
    }

    const kbObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !kbTyped) {
            kbTyped = true;
            startTypingSequence();
        }
    }, { threshold: 0.5 });

    const kbSection = document.getElementById('keyboard-section');
    if (kbSection) kbObserver.observe(kbSection);
});