// Select the input and output text boxes
const inputText = document.getElementById('inputText') as HTMLTextAreaElement;
const outputText = document.getElementById('outputText') as HTMLTextAreaElement;

// Select the buttons and options
const capitalizeCheckbox = document.getElementById('capitalize') as HTMLInputElement;
const spaceLinksCheckbox = document.getElementById('spaceLinks') as HTMLInputElement; // New "Space Links" option
const copyButton = document.getElementById('copy') as HTMLButtonElement;
const spacesInput = document.getElementById('spaces') as HTMLInputElement;
const newlinesInput = document.getElementById('newlines') as HTMLInputElement;

// Define the regex pattern to match URLs, including those without "http" or "https"
const linkPattern = /((https?:\/\/)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/\S*)?)/g; // Regex pattern to match URLs

// Function to add spacing to the text
const addSpacing = (text: string, spaces: number): string => {
    return text.split('').join(' '.repeat(spaces));
};

// Function to preserve links while adding spacing
const preserveLinksAndAddSpacing = (text: string, spaces: number): string => {
    return text.replace(linkPattern, (match) => `{LINK:${match}}`) // Replace links with placeholders
               .split(/\{LINK:(.+?)\}/g) // Split text by the placeholders
               .map((segment, index) => {
                   // If it's a link placeholder, don't add spacing
                   if (index % 2 !== 0) return segment;
                   // If it's not a link, add spacing
                   return addSpacing(segment, spaces);
               })
               .join(''); // Rejoin segments
};

// Function to update the output text with spacing, capitalization, and link preservation if needed
const updateOutputText = () => {
    const userInput = inputText.value;
    const spaces = Math.max(parseInt(spacesInput.value), 1);
    const newlinesMultiplier = Math.max(parseInt(newlinesInput.value), 1);

    let spacedText;

    if (spaceLinksCheckbox.checked) {
        // Preserve links while adding spacing to non-link text
        spacedText = preserveLinksAndAddSpacing(userInput, spaces)
            .split('\n')
            .join('\n'.repeat(newlinesMultiplier));
    } else {
        // Standard spacing
        spacedText = addSpacing(userInput, spaces)
            .split('\n')
            .join('\n'.repeat(newlinesMultiplier));
    }

    if (capitalizeCheckbox.checked) {
        spacedText = spacedText.toUpperCase();
    }

    outputText.value = spacedText;
};

// Add event listener for the "Space Links" checkbox
spaceLinksCheckbox.addEventListener('change', updateOutputText);

// Add event listeners to update the output text instantly when options change
inputText.addEventListener('input', updateOutputText);
spacesInput.addEventListener('input', updateOutputText);
newlinesInput.addEventListener('input', updateOutputText);
capitalizeCheckbox.addEventListener('change', updateOutputText);

// Add event listener for the copy button
copyButton.addEventListener('click', () => {
    // Copy the text from the outputText textarea to the clipboard
    navigator.clipboard.writeText(outputText.value)
        .then(() => {
            console.log('Text copied to clipboard');
        })
        .catch(err => {
            console.error('Failed to copy text: ', err);
        });
});

// Handle custom keyboard shortcuts
document.addEventListener('keydown', (event: KeyboardEvent) => {
    // Check if Ctrl + C is pressed
    if (event.ctrlKey && event.key === 'c') {
        event.preventDefault(); // Prevent the default browser copy action

        // Copy the text from the outputText textarea to the clipboard
        navigator.clipboard.writeText(outputText.value)
            .then(() => {
                console.log('Text copied to clipboard via Ctrl + C');
            })
            .catch(err => {
                console.error('Failed to copy text via Ctrl + C: ', err);
            });
    }
});

// Automatically focus the inputText textarea when the page loads
window.addEventListener('load', () => {
    inputText.focus();
});
