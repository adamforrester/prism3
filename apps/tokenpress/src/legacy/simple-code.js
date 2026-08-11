// Simple Token Press plugin code for testing
console.log('Token Press plugin loaded');

// Show UI with fixed dimensions
figma.showUI(`
<!DOCTYPE html>
<html>
<head>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
            padding: 20px; 
            margin: 0;
            width: 400px;
            height: 600px;
            overflow: hidden;
        }
        button { 
            background: #0066FF; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 6px; 
            cursor: pointer; 
            margin: 10px 0;
            width: 100%;
        }
        #output {
            background: #f5f5f5;
            padding: 10px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            white-space: pre-wrap;
            max-height: 300px;
            overflow-y: auto;
        }
    </style>
</head>
<body>
    <h1>Token Press</h1>
    <p>Found ${collections || 0} collections with ${variables || 0} variables!</p>
    <button onclick="scan()">Scan Variables</button>
    <div id="output">Click "Scan Variables" to test the API</div>
    
    <script>
        function scan() {
            parent.postMessage({ pluginMessage: { type: 'scan' } }, '*');
        }
        
        window.onmessage = (event) => {
            const message = event.data.pluginMessage;
            document.getElementById('output').innerHTML = JSON.stringify(message, null, 2);
        };
    </script>
</body>
</html>
`, { width: 400, height: 600, themeColors: true });

// Handle messages
figma.ui.onmessage = async (message) => {
    console.log('Received message:', message);
    
    if (message.type === 'scan') {
        try {
            // Test async API calls
            const collections = await figma.variables.getLocalVariableCollectionsAsync();
            const variables = await figma.variables.getLocalVariablesAsync();
            
            figma.ui.postMessage({
                type: 'scan-result',
                data: {
                    collections: collections.length,
                    variables: variables.length
                }
            });
        } catch (error) {
            console.error('Error:', error);
            figma.ui.postMessage({
                type: 'error',
                data: { message: error.message }
            });
        }
    }
};