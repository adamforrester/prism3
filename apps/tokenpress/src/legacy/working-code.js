// Token Press - Working version
console.log('Token Press plugin loaded');

// Comprehensive font weight mapping table
const COMPREHENSIVE_FONT_WEIGHT_MAP = {
  // Standard weights
  'thin': 100, 'hairline': 100,
  'extralight': 200, 'extra-light': 200, 'extra light': 200, 'ultralight': 200, 'ultra-light': 200, 'ultra light': 200,
  'light': 300,
  'regular': 400, 'normal': 400, 'book': 400, 'roman': 400,
  'medium': 500,
  'semibold': 600, 'semi-bold': 600, 'semi bold': 600, 'demibold': 600, 'demi-bold': 600, 'demi bold': 600,
  'bold': 700,
  'extrabold': 800, 'extra-bold': 800, 'extra bold': 800, 'ultrabold': 800, 'ultra-bold': 800, 'ultra bold': 800,
  'black': 900, 'heavy': 900,
  
  // Italic variations (same numeric values)
  'thin italic': 100, 'hairline italic': 100,
  'extralight italic': 200, 'extra-light italic': 200, 'extra light italic': 200, 'ultralight italic': 200, 'ultra-light italic': 200, 'ultra light italic': 200,
  'light italic': 300,
  'regular italic': 400, 'italic': 400, 'book italic': 400, 'roman italic': 400,
  'medium italic': 500,
  'semibold italic': 600, 'semi-bold italic': 600, 'semi bold italic': 600, 'demibold italic': 600, 'demi-bold italic': 600, 'demi bold italic': 600,
  'bold italic': 700,
  'extrabold italic': 800, 'extra-bold italic': 800, 'extra bold italic': 800, 'ultrabold italic': 800, 'ultra-bold italic': 800, 'ultra bold italic': 800,
  'black italic': 900, 'heavy italic': 900
};

// Legacy font weight map for backward compatibility
const FONT_WEIGHT_MAP = {
  'thin': 100,
  'extralight': 200,
  'ultralight': 200,
  'light': 300,
  'regular': 400,
  'normal': 400,
  'book': 400,
  'medium': 500,
  'semibold': 600,
  'demibold': 600,
  'bold': 700,
  'extrabold': 800,
  'ultrabold': 800,
  'black': 900,
  'heavy': 900
};

// Cubic Bezier easing conversion map for DTCG compliance
const CUBIC_BEZIER_MAP = {
  // Standard CSS easing keywords
  'linear': [0, 0, 1, 1],
  'ease': [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
  // Common cubic-bezier function strings (normalize to lowercase for matching)
  'cubic-bezier(0, 0, 1, 1)': [0, 0, 1, 1],
  'cubic-bezier(0.25, 0.1, 0.25, 1)': [0.25, 0.1, 0.25, 1],
  'cubic-bezier(0.42, 0, 1, 1)': [0.42, 0, 1, 1],
  'cubic-bezier(0, 0, 0.58, 1)': [0, 0, 0.58, 1],
  'cubic-bezier(0.42, 0, 0.58, 1)': [0.42, 0, 0.58, 1],
  'cubic-bezier(0.2, 0, 0, 1)': [0.2, 0, 0, 1],
  'cubic-bezier(0.4, 0, 0.2, 1)': [0.4, 0, 0.2, 1]
};

// Progress tracking system
const PROGRESS_STAGES = {
  SCANNING: { weight: 10, description: "Scanning tokens and styles" },
  CONVERTING: { weight: 70, description: "Converting to DTCG format" },
  EXPORTING: { weight: 15, description: "Creating export files" },
  COMPLETE: { weight: 5, description: "Export complete" }
};

let progressState = {
  stage: null,
  stageProgress: 0,
  totalItems: 0,
  processedItems: 0,
  overallProgress: 0
};

function updateProgress(stage, stagePercent = 0, processed = 0, total = 0) {
  progressState.stage = stage;
  progressState.stageProgress = Math.min(100, Math.max(0, stagePercent));
  progressState.processedItems = processed;
  progressState.totalItems = total;
  
  // Calculate overall progress based on stage weights
  let overallProgress = 0;
  const stages = Object.keys(PROGRESS_STAGES);
  const currentStageIndex = stages.indexOf(stage);
  
  // Add completed stages
  for (let i = 0; i < currentStageIndex; i++) {
    overallProgress += PROGRESS_STAGES[stages[i]].weight;
  }
  
  // Add current stage progress
  if (currentStageIndex >= 0) {
    overallProgress += (PROGRESS_STAGES[stage].weight * stagePercent / 100);
  }
  
  progressState.overallProgress = Math.min(100, Math.max(0, overallProgress));
  
  // Send progress update to UI
  figma.ui.postMessage({
    type: 'progress-update',
    data: {
      stage: stage,
      stageDescription: PROGRESS_STAGES[stage] ? PROGRESS_STAGES[stage].description : stage,
      stageProgress: progressState.stageProgress,
      overallProgress: progressState.overallProgress,
      processedItems: progressState.processedItems,
      totalItems: progressState.totalItems
    }
  });
}

// Show UI
figma.showUI(`
<!DOCTYPE html>
<html>
<head>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
            padding: 0; margin: 0; width: 400px; height: 600px;
            background: var(--figma-color-bg, #fff);
            color: var(--figma-color-text, #000);
            display: flex; flex-direction: column;
        }
        .header {
            padding: 16px;
            border-bottom: 1px solid var(--figma-color-border, #ccc);
            background: var(--figma-color-bg-secondary, #f8f8f8);
        }
        .header h1 { font-size: 18px; font-weight: 600; margin: 0 0 8px 0; }
        .summary { font-size: 12px; color: var(--figma-color-text-secondary, #666); }
        .content { flex: 1; padding: 16px; overflow-y: auto; }
        button { 
            background: var(--figma-color-bg-brand, #0066FF); 
            color: var(--figma-color-text-onbrand, white); 
            border: none; padding: 8px 16px; border-radius: 6px; 
            cursor: pointer; width: 100%; margin: 8px 0;
        }
        button:disabled { 
            background: var(--figma-color-bg-disabled, #ccc); 
            color: var(--figma-color-text-disabled, #999); 
            cursor: not-allowed; 
        }
        .output { 
            background: var(--figma-color-bg-secondary, #f5f5f5); 
            padding: 10px; border-radius: 4px; font-family: monospace; 
            font-size: 12px; margin-top: 16px; max-height: 200px; 
            overflow-y: auto; white-space: pre-wrap; 
        }
        .issues { margin-top: 16px; }
        .issue { 
            padding: 8px; border-radius: 4px; margin-bottom: 8px; 
            font-size: 12px; 
        }
        .issue.error { 
            background: #ffe6e6; border: 1px solid #ffcccc; 
            color: #cc0000; 
        }
        .issue.warning { 
            background: #fff5e6; border: 1px solid #ffddcc; 
            color: #cc6600; 
        }
        .progress-container { 
            margin-top: 16px; 
            display: none; 
        }
        .progress-header {
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 8px; 
            font-size: 12px; 
            color: var(--figma-color-text-secondary, #666);
        }
        .progress-bar-container { 
            background: var(--figma-color-bg-tertiary, #e5e5e5); 
            border-radius: 4px; 
            height: 8px; 
            overflow: hidden; 
            margin-bottom: 4px; 
        }
        .progress-bar { 
            background: var(--figma-color-bg-brand, #0066FF); 
            height: 100%; 
            width: 0%; 
            transition: width 0.3s ease; 
        }
        .progress-details { 
            font-size: 11px; 
            color: var(--figma-color-text-tertiary, #999); 
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Token Press</h1>
        <div class="summary" id="summary">Ready to scan your design tokens</div>
    </div>
    <div class="content">
        <button onclick="scan()">Scan & Validate</button>
        <button onclick="exportTokens()" id="export-btn" disabled>Export DTCG Tokens</button>
        
        <div class="progress-container" id="progress-container">
            <div class="progress-header">
                <span id="progress-stage">Initializing...</span>
                <span id="progress-percent">0%</span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar" id="progress-bar"></div>
            </div>
            <div class="progress-details" id="progress-details"></div>
        </div>
        
        <div id="output"></div>
        <div id="issues" class="issues"></div>
    </div>
    
    <script>
        let scanResult = null;
        
        function showProgress() {
            document.getElementById('progress-container').style.display = 'block';
        }
        
        function hideProgress() {
            document.getElementById('progress-container').style.display = 'none';
        }
        
        function updateProgressUI(progressData) {
            const progressBar = document.getElementById('progress-bar');
            const progressStage = document.getElementById('progress-stage');
            const progressPercent = document.getElementById('progress-percent');
            const progressDetails = document.getElementById('progress-details');
            
            progressBar.style.width = progressData.overallProgress + '%';
            progressStage.textContent = progressData.stageDescription || progressData.stage;
            progressPercent.textContent = Math.round(progressData.overallProgress) + '%';
            
            if (progressData.totalItems > 0) {
                progressDetails.textContent = progressData.processedItems + '/' + progressData.totalItems + ' items processed';
            } else {
                progressDetails.textContent = '';
            }
        }
        
        function scan() {
            showProgress();
            document.getElementById('output').innerHTML = '';
            parent.postMessage({ pluginMessage: { type: 'scan' } }, '*');
        }
        
        function exportTokens() {
            if (!scanResult) return;
            showProgress();
            document.getElementById('output').innerHTML = '';
            parent.postMessage({ pluginMessage: { type: 'export' } }, '*');
        }
        
        function downloadZip(zipData, filename) {
            const uint8Array = new Uint8Array(zipData);
            const blob = new Blob([uint8Array], { type: 'application/zip' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        
        window.onmessage = (event) => {
            const message = event.data.pluginMessage;
            const output = document.getElementById('output');
            const issues = document.getElementById('issues');
            const summary = document.getElementById('summary');
            const exportBtn = document.getElementById('export-btn');
            
            switch (message.type) {
                case 'progress-update':
                    updateProgressUI(message.data);
                    break;
                    
                case 'scan-result':
                    hideProgress();
                    scanResult = message.data;
                    summary.innerHTML = 'Variables: ' + message.data.collections + ' collection(s), ' + message.data.variables + ' token(s) • Text styles: ' + message.data.textStyles + ' • Effects: ' + message.data.effectStyles;
                    
                    // Create a formatted display instead of raw JSON
                    var scanResults = '<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif;">' +
                        '<div style="display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap;">' +
                            '<div style="background: var(--figma-color-bg-secondary, #f8f8f8); padding: 12px; border-radius: 6px; flex: 1; min-width: 120px;">' +
                                '<div style="font-size: 24px; font-weight: 600; color: var(--figma-color-text, #000);">' + message.data.collections + '</div>' +
                                '<div style="font-size: 12px; color: var(--figma-color-text-secondary, #666); text-transform: uppercase; letter-spacing: 0.5px;">Collection' + (message.data.collections !== 1 ? 's' : '') + '</div>' +
                            '</div>' +
                            '<div style="background: var(--figma-color-bg-secondary, #f8f8f8); padding: 12px; border-radius: 6px; flex: 1; min-width: 120px;">' +
                                '<div style="font-size: 24px; font-weight: 600; color: var(--figma-color-text, #000);">' + message.data.variables + '</div>' +
                                '<div style="font-size: 12px; color: var(--figma-color-text-secondary, #666); text-transform: uppercase; letter-spacing: 0.5px;">Variable' + (message.data.variables !== 1 ? 's' : '') + '</div>' +
                            '</div>' +
                        '</div>' +
                        '<div style="display: flex; gap: 16px; flex-wrap: wrap;">' +
                            '<div style="background: var(--figma-color-bg-secondary, #f8f8f8); padding: 12px; border-radius: 6px; flex: 1; min-width: 120px;">' +
                                '<div style="font-size: 24px; font-weight: 600; color: var(--figma-color-text, #000);">' + message.data.textStyles + '</div>' +
                                '<div style="font-size: 12px; color: var(--figma-color-text-secondary, #666); text-transform: uppercase; letter-spacing: 0.5px;">Text Style' + (message.data.textStyles !== 1 ? 's' : '') + '</div>' +
                            '</div>' +
                            '<div style="background: var(--figma-color-bg-secondary, #f8f8f8); padding: 12px; border-radius: 6px; flex: 1; min-width: 120px;">' +
                                '<div style="font-size: 24px; font-weight: 600; color: var(--figma-color-text, #000);">' + message.data.effectStyles + '</div>' +
                                '<div style="font-size: 12px; color: var(--figma-color-text-secondary, #666); text-transform: uppercase; letter-spacing: 0.5px;">Effect Style' + (message.data.effectStyles !== 1 ? 's' : '') + '</div>' +
                            '</div>' +
                        '</div>' +
                        (message.data.issues && message.data.issues.length === 0 ? 
                            '<div style="margin-top: 16px; padding: 12px; background: #e8f5e8; border: 1px solid #4caf50; border-radius: 6px; color: #2e7d32;"><div style="font-weight: 600; margin-bottom: 4px;">✓ Validation Passed</div><div style="font-size: 12px;">No issues found. Ready to export!</div></div>' : 
                            ''
                        ) +
                    '</div>';
                    
                    output.innerHTML = scanResults;
                    
                    // Display issues
                    issues.innerHTML = '';
                    if (message.data.issues && message.data.issues.length > 0) {
                        message.data.issues.forEach(issue => {
                            const div = document.createElement('div');
                            div.className = 'issue ' + issue.type;
                            div.textContent = issue.message;
                            issues.appendChild(div);
                        });
                    }
                    
                    // Enable export if no errors
                    const hasErrors = message.data.issues && message.data.issues.some(i => i.type === 'error');
                    exportBtn.disabled = hasErrors;
                    break;
                    
                case 'export-result':
                    hideProgress();
                    if (message.data.success) {
                        downloadZip(message.data.zipData, 'tokens.zip');
                        output.innerHTML = '✓ Downloaded ZIP with ' + message.data.fileCount + ' DTCG file(s) successfully!';
                    } else {
                        output.innerHTML = '✗ Export failed: ' + message.data.error;
                    }
                    break;
                    
                case 'error':
                    output.innerHTML = 'Error: ' + message.data.message;
                    break;
            }
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
            // Start scanning progress
            updateProgress('SCANNING', 10, 0, 4);
            
            // Get all resources
            const [collections, variables, textStyles, effectStyles] = await Promise.all([
                figma.variables.getLocalVariableCollectionsAsync(),
                figma.variables.getLocalVariablesAsync(),
                figma.getLocalTextStylesAsync(),
                figma.getLocalEffectStylesAsync()
            ]);
            
            updateProgress('SCANNING', 50, 2, 4);
            console.log('Found: ' + collections.length + ' collections, ' + variables.length + ' variables, ' + textStyles.length + ' text styles, ' + effectStyles.length + ' effect styles');
            
            // Basic validation
            const issues = [];
            updateProgress('SCANNING', 75, 3, 4);
            
            // Check for broken aliases
            variables.forEach(variable => {
                Object.entries(variable.valuesByMode).forEach(([modeId, value]) => {
                    if (typeof value === 'object' && value.type === 'VARIABLE_ALIAS') {
                        const targetExists = variables.some(v => v.id === value.id);
                        if (!targetExists) {
                            issues.push({
                                type: 'error',
                                message: 'Broken alias in variable "' + variable.name + '"',
                                source: 'variable-' + variable.id
                            });
                        }
                    }
                });
            });
            
            updateProgress('SCANNING', 100, 4, 4);
            
            figma.ui.postMessage({
                type: 'scan-result',
                data: {
                    collections: collections.length,
                    variables: variables.length,
                    textStyles: textStyles.length,
                    effectStyles: effectStyles.length,
                    issues
                }
            });
        } catch (error) {
            console.error('Scan error:', error);
            figma.ui.postMessage({
                type: 'error',
                data: { message: error.message }
            });
        }
    }
    
    if (message.type === 'export') {
        try {
            // Start export progress
            updateProgress('SCANNING', 10, 0, 4);
            
            // Get all resources again for export
            const [collections, variables, textStyles, effectStyles] = await Promise.all([
                figma.variables.getLocalVariableCollectionsAsync(),
                figma.variables.getLocalVariablesAsync(),
                figma.getLocalTextStylesAsync(),
                figma.getLocalEffectStylesAsync()
            ]);
            
            // Count total items for better progress tracking
            const totalVariableItems = collections.reduce((sum, collection) => {
                const collectionVars = variables.filter(v => v.variableCollectionId === collection.id);
                return sum + (collectionVars.length * collection.modes.length);
            }, 0);
            const totalItems = totalVariableItems + textStyles.length + effectStyles.length;
            
            updateProgress('CONVERTING', 0, 0, totalItems);
            
            const files = {};
            let fileCount = 0;
            let processedItems = 0;
            
            // Export variables by collection/mode
            for (const collection of collections) {
                const collectionVariables = variables.filter(v => v.variableCollectionId === collection.id);
                
                for (const mode of collection.modes) {
                    const fileName = collection.modes.length === 1 
                        ? sanitizeFileName(collection.name) + '.json'
                        : sanitizeFileName(collection.name) + '-' + sanitizeFileName(mode.name) + '.json';
                    
                    const tokens = {};
                    const fontWeightTokens = {};
                    
                    collectionVariables.forEach((variable, index) => {
                        const value = variable.valuesByMode[mode.modeId];
                        if (value === undefined) return;
                        
                        const tokenPath = sanitizeTokenName(variable.name);
                        const dtcgToken = convertVariableToDTCG(variable, value, variables);
                        setNestedProperty(tokens, tokenPath.split('/'), dtcgToken);
                        
                        // Update progress every 10 variables or on last variable
                        if (index % 10 === 0 || index === collectionVariables.length - 1) {
                            processedItems++;
                            updateProgress('CONVERTING', (processedItems / totalItems) * 100, processedItems, totalItems);
                        }
                        
                        // Add numeric font weight companions for string weights
                        if (variable.resolvedType === 'STRING' && variable.scopes.includes('FONT_WEIGHT')) {
                            const numericWeight = getNumericFontWeight(String(value));
                            if (numericWeight && typeof value === 'string') {
                                const numericTokenPath = tokenPath + '-numeric';
                                const numericToken = {
                                    $type: 'number',
                                    $value: numericWeight,
                                    $description: 'Numeric weight for ' + variable.name,
                                    $extensions: {
                                        figma: {
                                            mappedFrom: variable.name,
                                            originalValue: String(value)
                                        }
                                    }
                                };
                                setNestedProperty(tokens, numericTokenPath.split('/'), numericToken);
                            }
                        }
                    });

                    // Compile transition composites before creating final file data
                    compileTransitionComposites(tokens, variables);

                    const fileData = Object.assign({}, tokens, {
                        $extensions: {
                            generator: { name: 'Token Press', version: '1.0.0' },
                            figma: {
                                collection: { id: collection.id, name: collection.name },
                                mode: mode.name
                            }
                        }
                    });
                    files[fileName] = JSON.stringify(fileData, null, 2);
                    fileCount++;
                }
            }
            
            // Export text styles as typography
            if (textStyles.length > 0) {
                const typographyTokens = {};
                
                textStyles.forEach((textStyle, index) => {
                    const tokenPath = sanitizeTokenName(textStyle.name);
                    const boundVars = getBoundVariablesForTextStyle(textStyle);
                    
                    const typographyValue = {
                        fontFamily: resolveTypographyProperty(textStyle.fontName.family, boundVars.fontFamily, variables, 'fontFamily'),
                        fontSize: resolveTypographyProperty({ value: textStyle.fontSize, unit: 'px' }, boundVars.fontSize, variables, 'fontSize'),
                        fontWeight: resolveTypographyProperty(resolveFontWeight(textStyle.fontName.style, variables), boundVars.fontWeight, variables, 'fontWeight'),
                        letterSpacing: resolveTypographyProperty({ value: textStyle.letterSpacing.value, unit: 'px' }, boundVars.letterSpacing, variables, 'letterSpacing'),
                        lineHeight: resolveTypographyProperty(resolveLineHeight(textStyle.lineHeight, textStyle.fontSize, variables), boundVars.lineHeight, variables, 'lineHeight')
                    };
                    
                    // Add fontStyle if italic is detected
                    const fontStyle = detectFontStyle(textStyle.fontName);
                    if (fontStyle === 'italic') {
                        typographyValue.fontStyle = 'italic';
                    }
                    
                    const token = {
                        $type: 'typography',
                        $value: typographyValue
                    };
                    
                    if (textStyle.description) {
                        token.$description = textStyle.description;
                    }
                    
                    setNestedProperty(typographyTokens, tokenPath.split('/'), token);
                    
                    // Update progress for each text style
                    processedItems++;
                    updateProgress('CONVERTING', (processedItems / totalItems) * 100, processedItems, totalItems);
                });
                
                files['typography.json'] = JSON.stringify({
                    typography: typographyTokens,
                    $extensions: {
                        generator: { name: 'Token Press', version: '1.0.0' }
                    }
                }, null, 2);
                fileCount++;
            }
            
            // Export effect styles as shadows
            if (effectStyles.length > 0) {
                const shadowTokens = {};
                
                effectStyles.forEach((effectStyle, index) => {
                    const tokenPath = sanitizeTokenName(effectStyle.name);
                    const shadowLayers = [];
                    
                    effectStyle.effects.forEach((effect, effectIndex) => {
                        if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
                            const boundVars = getBoundVariablesForEffect(effectStyle, effectIndex, variables);
                            
                            const shadowLayer = {
                                color: resolveEffectProperty(effect.color, boundVars.color, variables, 'color'),
                                offsetX: resolveEffectProperty({ value: effect.offset.x, unit: 'px' }, boundVars.offsetX, variables, 'offsetX'),
                                offsetY: resolveEffectProperty({ value: effect.offset.y, unit: 'px' }, boundVars.offsetY, variables, 'offsetY'),
                                blur: resolveEffectProperty({ value: effect.radius, unit: 'px' }, boundVars.blur, variables, 'blur'),
                                spread: resolveEffectProperty({ value: effect.spread || 0, unit: 'px' }, boundVars.spread, variables, 'spread')
                            };
                            
                            if (effect.type === 'INNER_SHADOW') {
                                shadowLayer.inset = true;
                            }
                            
                            shadowLayers.push(shadowLayer);
                        }
                    });
                    
                    const token = {
                        $type: 'shadow',
                        $value: shadowLayers.length === 1 ? shadowLayers[0] : shadowLayers
                    };
                    
                    if (effectStyle.description) {
                        token.$description = effectStyle.description;
                    }
                    
                    setNestedProperty(shadowTokens, tokenPath.split('/'), token);
                    
                    // Update progress for each effect style
                    processedItems++;
                    updateProgress('CONVERTING', (processedItems / totalItems) * 100, processedItems, totalItems);
                });
                
                files['shadows.json'] = JSON.stringify({
                    shadow: shadowTokens,
                    $extensions: {
                        generator: { name: 'Token Press', version: '1.0.0' }
                    }
                }, null, 2);
                fileCount++;
            }
            
            // Create ZIP file
            updateProgress('EXPORTING', 50, 0, 1);
            const zipData = createZipFile(files);
            updateProgress('COMPLETE', 100, 1, 1);
            
            figma.ui.postMessage({
                type: 'export-result',
                data: {
                    success: true,
                    fileCount,
                    zipData: Array.from(zipData)
                }
            });
        } catch (error) {
            console.error('Export error:', error);
            figma.ui.postMessage({
                type: 'export-result',
                data: {
                    success: false,
                    error: error.message
                }
            });
        }
    }
};

// Helper functions
function sanitizeFileName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function sanitizeTokenName(name) {
    return name.split('/').map(part => 
        part.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    ).join('/');
}

function convertVariableToDTCG(variable, value, allVariables) {
    const dtcgType = mapVariableTypeToDTCG(variable.resolvedType, variable.scopes, variable);
    const token = {
        $type: dtcgType,
        $value: convertVariableValue(value, variable.resolvedType, allVariables, variable, dtcgType)
    };
    
    if (variable.description) {
        token.$description = variable.description;
    }
    
    return token;
}

function mapVariableTypeToDTCG(type, scopes, variable) {
    // Declare tokenName at function level so it's available to all cases
    const tokenName = variable.name.toLowerCase();

    switch (type) {
        case 'COLOR': return 'color';
        case 'FLOAT':
            if (scopes.includes('FONT_WEIGHT')) return 'fontWeight';

            // Check for unitless number types based on scopes
            if (scopes.includes('LINE_HEIGHT') || scopes.includes('OPACITY')) return 'number';

            // Check for unitless number types based on token name keywords
            const numberKeywords = [
                'opacity', 'alpha', 'line-height', 'leading', 'font-weight', 'weight',
                'grid-columns', 'columns', 'z-index', 'layer', 'flex', 'order',
                'scale', 'zoom', 'aspect', 'ratio', 'count', 'quantity', 'index',
                'multiplier', 'factor'
            ];

            if (numberKeywords.some(keyword => tokenName.includes(keyword))) {
                return 'number';
            }

            // Default to dimension for all other FLOAT values (physical measurements)
            return 'dimension';
        case 'STRING':
            // Check for cubic bezier / easing tokens
            const easingKeywords = [
                'easing', 'ease', 'timing', 'curve', 'bezier',
                'cubic-bezier', 'timing-function', 'timingfunction'
            ];

            // Check by name pattern for easing
            if (easingKeywords.some(keyword => tokenName.includes(keyword))) {
                // Verify the value looks like an easing by checking first mode
                const firstModeId = Object.keys(variable.valuesByMode)[0];
                const value = variable.valuesByMode[firstModeId];
                if (typeof value === 'string' && parseCubicBezier(value)) {
                    return 'cubicBezier';
                }
            }
 
            if (scopes.includes('FONT_FAMILY')) return 'fontFamily';
            if (scopes.includes('FONT_WEIGHT')) return 'fontWeight';
            
            // Check for font weight by name pattern (for variables without proper scope)
            // tokenName already declared above for FLOAT case
            const fontWeightKeywords = [
                'font-weight', 'fontweight', 'weight', 'fw', 
                'thin', 'light', 'regular', 'medium', 'bold', 'black', 'heavy',
                'extra', 'ultra', 'semi', 'demi'
            ];
            
            // Check if it's in a weight-related path or has weight-related keywords
            if (tokenName.includes('weight') || 
                fontWeightKeywords.some(keyword => tokenName.includes(keyword))) {
                // Additional check: see if the string value looks like a font weight
                const firstModeId = Object.keys(variable.valuesByMode)[0];
                const value = variable.valuesByMode[firstModeId];
                if (typeof value === 'string' && isLikelyFontWeight(value)) {
                    return 'fontWeight';
                }
            }
            
            return 'string';
        case 'BOOLEAN': return 'number';
        default: return 'string';
    }
}

function convertVariableValue(value, type, allVariables, variable = null, dtcgType = null) {
    if (typeof value === 'object' && value.type === 'VARIABLE_ALIAS') {
        const targetVariable = allVariables.find(v => v.id === value.id);
        const tokenPath = targetVariable ? sanitizeTokenName(targetVariable.name) : value.id;
        return '{' + tokenPath.replace(/\//g, '.') + '}';
    }
    
    switch (type) {
        case 'COLOR':
            return convertColor(value);
        case 'FLOAT':
            if (typeof value === 'number') {
                // If the DTCG type is 'number', return just the number value
                if (dtcgType === 'number') {
                    return Math.round(value * 1000) / 1000;
                }
                // Otherwise, return dimension object for 'dimension' type
                return {
                    value: Math.round(value * 1000) / 1000,
                    unit: 'px'
                };
            }
            return dtcgType === 'number' ? 0 : { value: 0, unit: 'px' };
        case 'STRING':
            // Check if this is a cubic bezier / easing value
            if (dtcgType === 'cubicBezier') {
                const bezierArray = parseCubicBezier(String(value));
                return bezierArray || [0, 0, 1, 1]; // Default to linear if parsing fails
            }
            // Check if this is a font weight variable that should be converted to numeric
            if (variable && shouldConvertFontWeight(variable, value)) {
                return convertFontWeightVariable(String(value));
            }
            return String(value);
        case 'BOOLEAN':
            return value ? 1 : 0;
        default:
            return value;
    }
}

function parseCubicBezier(value) {
    if (!value) return null;

    // If it's already an array, return it
    if (Array.isArray(value)) {
        return value;
    }

    // Convert to string and normalize
    const normalized = String(value).toLowerCase().trim();

    // Try direct map lookup first
    if (CUBIC_BEZIER_MAP[normalized]) {
        return CUBIC_BEZIER_MAP[normalized];
    }

    // Try to parse cubic-bezier() function format
    const match = normalized.match(/cubic-bezier\s*\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/);
    if (match) {
        return [
            parseFloat(match[1]),
            parseFloat(match[2]),
            parseFloat(match[3]),
            parseFloat(match[4])
        ];
    }

    // Check for named easings without cubic-bezier() wrapper
    for (const [key, bezier] of Object.entries(CUBIC_BEZIER_MAP)) {
        if (key === normalized) {
            return bezier;
        }
    }

    return null;
}

function resolveEasingValue(value, allVariables) {
    // If value is undefined or null, return default
    if (value === undefined || value === null) {
        return [0, 0, 1, 1]; // Default to linear
    }

    // If it's a reference string like "{pds.motion.easing.ease-out}"
    if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
        // Extract the token path and convert to variable name format
        const tokenPath = value.slice(1, -1); // Remove { }
        const variableName = tokenPath.replace(/\./g, '/'); // Convert dots to slashes

        // Find the variable
        const targetVariable = allVariables.find(v => {
            const varPath = sanitizeTokenName(v.name);
            return varPath === variableName;
        });

        if (targetVariable) {
            // Get the first mode's value
            const firstModeId = Object.keys(targetVariable.valuesByMode)[0];
            const targetValue = targetVariable.valuesByMode[firstModeId];

            // Parse the target value
            const bezierArray = parseCubicBezier(targetValue);
            if (bezierArray) return bezierArray;
        }
    }

    // Try to parse the value directly
    const bezierArray = parseCubicBezier(value);
    if (bezierArray) return bezierArray;

    // Default to linear if all else fails
    return [0, 0, 1, 1];
}

function convertColor(color) {
    // Convert to hex format instead of DTCG color object
    var r = Math.round(color.r * 255);
    var g = Math.round(color.g * 255);
    var b = Math.round(color.b * 255);
    var a = color.a !== undefined ? color.a : 1.0;
    
    // Convert to hex
    function toHex(value) {
        var hex = value.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }
    
    // Return hex with alpha if not fully opaque
    if (a < 1.0) {
        var alpha = Math.round(a * 255);
        return '#' + toHex(r) + toHex(g) + toHex(b) + toHex(alpha);
    } else {
        return '#' + toHex(r) + toHex(g) + toHex(b);
    }
}

function findFontWeightVariable(fontStyle, allVariables) {
    // Get the expected numeric weight
    const expectedWeight = getExpectedFontWeight(fontStyle);
    
    // Look for variables that match common naming patterns
    const weightName = extractWeightName(fontStyle);
    const possibleNames = [
        `font-weight-${weightName}`,
        `fontweight-${weightName}`,
        `weight-${weightName}`,
        `fw-${weightName}`,
        // Also try with numeric values
        `font-weight-${expectedWeight}`,
        `fontweight-${expectedWeight}`,
        `weight-${expectedWeight}`,
        `fw-${expectedWeight}`
    ];
    
    // First, try to find by name pattern
    for (const name of possibleNames) {
        const variable = allVariables.find(v => 
            v.name.toLowerCase().includes(name.toLowerCase()) && 
            (v.resolvedType === 'STRING' || v.resolvedType === 'FLOAT') &&
            (v.scopes.includes('FONT_WEIGHT') || v.name.toLowerCase().includes('weight'))
        );
        if (variable) return variable;
    }
    
    // Second, try to find by matching converted value (for STRING variables)
    const matchingVariable = allVariables.find(v => {
        if (!v.scopes.includes('FONT_WEIGHT') && !v.name.toLowerCase().includes('weight')) return false;
        
        // Get the first mode value to compare
        const firstModeId = Object.keys(v.valuesByMode)[0];
        const value = v.valuesByMode[firstModeId];
        
        if (v.resolvedType === 'STRING' && typeof value === 'string') {
            // Convert the string value and see if it matches our expected weight
            const convertedWeight = convertFontWeightVariable(value);
            return convertedWeight === expectedWeight;
        }
        
        if (v.resolvedType === 'FLOAT' && typeof value === 'number') {
            // Check if the numeric value matches
            return Math.abs(value - expectedWeight) < 1;
        }
        
        return false;
    });
    
    return matchingVariable;
}

function extractWeightName(fontStyle) {
    // Extract weight name from font style, removing italic
    const normalized = fontStyle.toLowerCase()
        .replace(/\s*italic\s*/g, ' ')
        .replace(/\s*oblique\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    // Find the weight part - order matters, check longer/more specific names first
    const weights = [
        'extrabold', 'ultrabold', 'extralight', 'ultralight', 'semibold', 'demibold',
        'thin', 'light', 'regular', 'normal', 'book', 'medium', 'bold', 'black', 'heavy'
    ];
    
    for (const weight of weights) {
        if (normalized.includes(weight)) {
            return weight;
        }
    }
    
    return 'regular'; // fallback
}

function getExpectedFontWeight(fontStyle) {
    const numericMatch = fontStyle.match(/(\d+)/);
    if (numericMatch) {
        return parseInt(numericMatch[1]);
    }
    
    // First remove italic/oblique, then normalize spaces - same logic as extractWeightName
    const normalizedStyle = fontStyle.toLowerCase()
        .replace(/\s*italic\s*/g, ' ')
        .replace(/\s*oblique\s*/g, ' ')
        .replace(/\s+/g, '');
    
    return COMPREHENSIVE_FONT_WEIGHT_MAP[normalizedStyle] || 
           FONT_WEIGHT_MAP[normalizedStyle] || 400;
}

function resolveFontWeight(fontStyle, allVariables = []) {
    // First, try to find a corresponding font weight variable
    const matchingVariable = findFontWeightVariable(fontStyle, allVariables);
    if (matchingVariable) {
        // Return variable reference instead of calculated value
        const tokenPath = sanitizeTokenName(matchingVariable.name);
        return '{' + tokenPath.replace(/\//g, '.') + '}';
    }
    
    // Fallback to numeric calculation
    return getExpectedFontWeight(fontStyle);
}

function getNumericFontWeight(fontWeightString) {
    // First check if it's already numeric
    const numericMatch = fontWeightString.match(/(\d+)/);
    if (numericMatch) {
        return parseInt(numericMatch[1]);
    }
    
    // Map named weights to numeric values
    const normalizedStyle = fontWeightString.toLowerCase().replace(/\s+/g, '');
    return FONT_WEIGHT_MAP[normalizedStyle];
}

function convertFontWeightVariable(stringValue) {
    // 1. Check if it's already numeric
    const numericMatch = stringValue.match(/(\d+)/);
    if (numericMatch) {
        return parseInt(numericMatch[1]);
    }
    
    // 2. Normalize string (lowercase, handle spaces/hyphens)
    const normalized = stringValue.toLowerCase()
        .replace(/[-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    // 3. Remove "italic" and style suffixes for weight extraction
    const weightOnly = normalized
        .replace(/\s*italic\s*/g, ' ')
        .replace(/\s*oblique\s*/g, ' ')
        .trim();
    
    // 4. Map to numeric value - try weight-only first, then full string
    return COMPREHENSIVE_FONT_WEIGHT_MAP[weightOnly] || 
           COMPREHENSIVE_FONT_WEIGHT_MAP[normalized] || 
           400; // fallback to regular
}

function detectFontStyle(fontName) {
    const style = fontName.style.toLowerCase();
    return style.includes('italic') || style.includes('oblique') ? 'italic' : 'normal';
}

function isLikelyFontWeight(value) {
    const lowerValue = value.toLowerCase().trim();
    
    // Check if it's a numeric string
    if (/^\d+$/.test(lowerValue)) {
        const num = parseInt(lowerValue);
        return num >= 100 && num <= 900 && num % 100 === 0;
    }
    
    // Check if it's a known weight name (including with italic)
    const weightNames = [
        'thin', 'hairline', 'extralight', 'extra-light', 'extra light', 
        'ultralight', 'ultra-light', 'ultra light', 'light',
        'regular', 'normal', 'book', 'roman', 'medium',
        'semibold', 'semi-bold', 'semi bold', 'demibold', 'demi-bold', 'demi bold',
        'bold', 'extrabold', 'extra-bold', 'extra bold', 
        'ultrabold', 'ultra-bold', 'ultra bold', 'black', 'heavy'
    ];
    
    // Remove italic/oblique from the value for weight checking
    const weightOnly = lowerValue
        .replace(/\s*italic\s*/g, ' ')
        .replace(/\s*oblique\s*/g, ' ')
        .trim();
    
    return weightNames.includes(weightOnly) || weightNames.includes(lowerValue);
}

function shouldConvertFontWeight(variable, value) {
    // First check if it has the proper scope
    if (variable.scopes && variable.scopes.includes('FONT_WEIGHT')) {
        return true;
    }
    
    // Then check by name pattern (same logic as mapVariableTypeToDTCG)
    const tokenName = variable.name.toLowerCase();
    const fontWeightKeywords = [
        'font-weight', 'fontweight', 'weight', 'fw', 
        'thin', 'light', 'regular', 'medium', 'bold', 'black', 'heavy',
        'extra', 'ultra', 'semi', 'demi'
    ];
    
    // Check if it's in a weight-related path or has weight-related keywords
    if (tokenName.includes('weight') || 
        fontWeightKeywords.some(keyword => tokenName.includes(keyword))) {
        // Additional check: see if the string value looks like a font weight
        if (typeof value === 'string' && isLikelyFontWeight(value)) {
            return true;
        }
    }
    
    return false;
}

function findLineHeightVariable(percentageValue, allVariables) {
    const targetUnitless = percentageValue / 100;
    
    // Look for variables that match common naming patterns and values
    const possibleNames = [
        `line-height-${Math.round(percentageValue)}`,
        `lineheight-${Math.round(percentageValue)}`,
        `line-height-${targetUnitless.toString().replace('.', '')}`,
        `lineheight-${targetUnitless.toString().replace('.', '')}`,
        `leading-${Math.round(percentageValue)}`,
        `lh-${Math.round(percentageValue)}`,
        // Also check for the unitless value patterns
        `line-height-${targetUnitless}`,
        `lineheight-${targetUnitless}`,
        `leading-${targetUnitless}`,
        `lh-${targetUnitless}`
    ];
    
    // First, try to find by name pattern
    for (const name of possibleNames) {
        const variable = allVariables.find(v => 
            v.name.toLowerCase().includes(name.toLowerCase()) && 
            v.resolvedType === 'FLOAT' &&
            (v.scopes.includes('LINE_HEIGHT') || v.name.toLowerCase().includes('line') || v.name.toLowerCase().includes('leading'))
        );
        if (variable) return variable;
    }
    
    // Second, try to find by matching value (within tolerance)
    const tolerance = 0.001;
    const matchingVariable = allVariables.find(v => {
        if (v.resolvedType !== 'FLOAT') return false;
        if (!v.scopes.includes('LINE_HEIGHT') && 
            !v.name.toLowerCase().includes('line') && 
            !v.name.toLowerCase().includes('leading')) return false;
        
        // Get the first mode value to compare
        const firstModeId = Object.keys(v.valuesByMode)[0];
        const value = v.valuesByMode[firstModeId];
        
        // Check if the variable value matches our target unitless value
        if (typeof value === 'number') {
            return Math.abs(value - targetUnitless) < tolerance;
        }
        return false;
    });
    
    return matchingVariable;
}

function resolveLineHeight(lineHeight, fontSize, allVariables = []) {
    let multiplier;
    
    switch (lineHeight.unit) {
        case 'PERCENT':
            // First, try to find a corresponding unitless variable
            const matchingVariable = findLineHeightVariable(lineHeight.value, allVariables);
            if (matchingVariable) {
                // Return variable reference instead of calculated value
                const tokenPath = sanitizeTokenName(matchingVariable.name);
                return '{' + tokenPath.replace(/\//g, '.') + '}';
            }
            // Fallback to percentage calculation
            multiplier = lineHeight.value / 100;
            break;
        case 'PIXELS':
            multiplier = lineHeight.value / fontSize;
            break;
        case 'AUTO':
        default:
            multiplier = 1.2;
    }
    
    // Round to 3 decimals for readability and diff hygiene
    return Math.round(multiplier * 1000) / 1000;
}

function getBoundVariablesForTextStyle(textStyle) {
    const boundVars = {};
    
    if (textStyle.boundVariables) {
        if (textStyle.boundVariables.fontFamily) {
            boundVars.fontFamily = textStyle.boundVariables.fontFamily;
        }
        if (textStyle.boundVariables.fontSize) {
            boundVars.fontSize = textStyle.boundVariables.fontSize;
        }
        if (textStyle.boundVariables.fontWeight) {
            boundVars.fontWeight = textStyle.boundVariables.fontWeight;
        }
        if (textStyle.boundVariables.letterSpacing) {
            boundVars.letterSpacing = textStyle.boundVariables.letterSpacing;
        }
        if (textStyle.boundVariables.lineHeight) {
            boundVars.lineHeight = textStyle.boundVariables.lineHeight;
        }
    }
    
    return boundVars;
}

function resolveTypographyProperty(fallbackValue, boundVariable, allVariables, propertyType) {
    // Prefer alias if bound variable exists
    if (boundVariable) {
        const targetVariable = allVariables.find(v => v.id === boundVariable.id);
        if (targetVariable) {
            const tokenPath = sanitizeTokenName(targetVariable.name);
            return '{' + tokenPath.replace(/\//g, '.') + '}';
        }
    }
    
    return fallbackValue;
}

function getBoundVariablesForEffect(effectStyle, effectIndex, allVariables) {
    // For MVP: Return empty bound variables to use only literal values
    // This avoids complex Figma API bound variable structure issues
    return {};
}

function resolveEffectProperty(fallbackValue, boundVariable, allVariables, propertyType) {
    // Prefer alias if bound variable exists (same logic as typography)
    if (boundVariable) {
        const targetVariable = allVariables.find(v => v.id === boundVariable.id);
        if (targetVariable) {
            const tokenPath = sanitizeTokenName(targetVariable.name);
            return '{' + tokenPath.replace(/\//g, '.') + '}';
        }
    }
    
    // Fallback to literal value
    if (propertyType === 'color') {
        return convertColor(fallbackValue);
    }
    
    return fallbackValue;
}

function setNestedProperty(obj, path, value) {
    const lastKey = path.pop();
    const target = path.reduce((current, key) => {
        return current[key] = current[key] || {};
    }, obj);
    target[lastKey] = value;
}

function compileTransitionComposites(tokens, allVariables) {
    // Recursively process the token tree to find and compile transition groups
    function processObject(obj) {
        if (!obj || typeof obj !== 'object') return;

        // Check if this object is a transition group
        // A transition group has children named: duration, delay, timingfunction (or variations)
        const keys = Object.keys(obj);
        const hasDuration = keys.some(k => k.toLowerCase().includes('duration'));
        const hasDelay = keys.some(k => k.toLowerCase().includes('delay'));
        const hasTimingFunction = keys.some(k => {
            const lk = k.toLowerCase();
            return lk.includes('timing') || lk.includes('easing');
        });

        // If this looks like a transition group, try to compile it
        if ((hasDuration || hasDelay || hasTimingFunction) && !obj.$type) {
            // Find the actual property tokens
            let durationToken = null;
            let delayToken = null;
            let timingFunctionToken = null;
            let durationKey = null;
            let delayKey = null;
            let timingFunctionKey = null;

            for (const key of keys) {
                const lowerKey = key.toLowerCase();
                if (lowerKey.includes('duration') && obj[key].$type) {
                    durationToken = obj[key];
                    durationKey = key;
                }
                if (lowerKey.includes('delay') && obj[key].$type) {
                    delayToken = obj[key];
                    delayKey = key;
                }
                if ((lowerKey.includes('timing') || lowerKey.includes('easing')) && obj[key].$type) {
                    timingFunctionToken = obj[key];
                    timingFunctionKey = key;
                }
            }

            // If we found at least one transition property token, compile the composite
            if (durationToken || delayToken || timingFunctionToken) {
                // Extract values with defaults
                const duration = durationToken?.$value || { value: 0, unit: 'ms' };
                const delay = delayToken?.$value || { value: 0, unit: 'ms' };
                let timingFunction = [0, 0, 1, 1]; // Default to linear

                // Resolve timing function
                if (timingFunctionToken) {
                    timingFunction = resolveEasingValue(timingFunctionToken.$value, allVariables);
                }

                // Collect descriptions from any of the individual tokens
                let description = durationToken?.$description || delayToken?.$description || timingFunctionToken?.$description;

                // Build the composite transition token
                const compositeToken = {
                    $type: 'transition',
                    $value: {
                        duration: duration,
                        delay: delay,
                        timingFunction: timingFunction
                    }
                };

                if (description) {
                    compositeToken.$description = description;
                }

                // Remove the individual property tokens
                if (durationKey) delete obj[durationKey];
                if (delayKey) delete obj[delayKey];
                if (timingFunctionKey) delete obj[timingFunctionKey];

                // Replace with composite (merge into the current object)
                Object.assign(obj, compositeToken);

                return; // Don't recurse into this object since we've converted it
            }
        }

        // Recursively process child objects
        for (const key of Object.keys(obj)) {
            if (key.startsWith('$')) continue; // Skip DTCG metadata properties
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                processObject(obj[key]);
            }
        }
    }

    processObject(tokens);
}

// Simplified ZIP implementation with CRC-32 calculation
function createZipFile(files) {
    const fileEntries = Object.entries(files);
    
    // Simple CRC-32 calculation
    function calculateCRC32(data) {
        const crcTable = [];
        for (let i = 0; i < 256; i++) {
            let crc = i;
            for (let j = 0; j < 8; j++) {
                crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
            }
            crcTable[i] = crc;
        }
        
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < data.length; i++) {
            crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }
    
    // Convert string to UTF-8 bytes
    function stringToBytes(str) {
        const bytes = [];
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
            if (code < 0x80) {
                bytes.push(code);
            } else if (code < 0x800) {
                bytes.push(0xC0 | (code >> 6));
                bytes.push(0x80 | (code & 0x3F));
            } else {
                bytes.push(0xE0 | (code >> 12));
                bytes.push(0x80 | ((code >> 6) & 0x3F));
                bytes.push(0x80 | (code & 0x3F));
            }
        }
        return new Uint8Array(bytes);
    }
    
    // Write little-endian integers
    function writeLE16(arr, offset, value) {
        arr[offset] = value & 0xFF;
        arr[offset + 1] = (value >> 8) & 0xFF;
    }
    
    function writeLE32(arr, offset, value) {
        arr[offset] = value & 0xFF;
        arr[offset + 1] = (value >> 8) & 0xFF;
        arr[offset + 2] = (value >> 16) & 0xFF;
        arr[offset + 3] = (value >> 24) & 0xFF;
    }
    
    const localFiles = [];
    let totalLocalSize = 0;
    
    // Process each file
    fileEntries.forEach(([filename, content]) => {
        const filenameBytes = stringToBytes(filename);
        const contentBytes = stringToBytes(content);
        const crc32 = calculateCRC32(contentBytes);
        
        const localHeaderSize = 30 + filenameBytes.length;
        const localHeader = new Uint8Array(localHeaderSize);
        
        // Local file header
        let pos = 0;
        // Signature "PK\x03\x04"
        writeLE32(localHeader, pos, 0x04034b50); pos += 4;
        // Version needed to extract
        writeLE16(localHeader, pos, 20); pos += 2;
        // General purpose bit flag
        writeLE16(localHeader, pos, 0); pos += 2;
        // Compression method (stored = 0)
        writeLE16(localHeader, pos, 0); pos += 2;
        // Last mod time
        writeLE16(localHeader, pos, 0); pos += 2;
        // Last mod date
        writeLE16(localHeader, pos, 0x21); pos += 2; // Jan 1, 1980
        // CRC-32
        writeLE32(localHeader, pos, crc32); pos += 4;
        // Compressed size
        writeLE32(localHeader, pos, contentBytes.length); pos += 4;
        // Uncompressed size
        writeLE32(localHeader, pos, contentBytes.length); pos += 4;
        // Filename length
        writeLE16(localHeader, pos, filenameBytes.length); pos += 2;
        // Extra field length
        writeLE16(localHeader, pos, 0); pos += 2;
        // Filename
        localHeader.set(filenameBytes, pos);
        
        localFiles.push({
            filename,
            filenameBytes,
            contentBytes,
            crc32,
            header: localHeader,
            offset: totalLocalSize
        });
        
        totalLocalSize += localHeaderSize + contentBytes.length;
    });
    
    // Central directory
    const centralDirStart = totalLocalSize;
    const centralHeaders = [];
    let centralDirSize = 0;
    
    localFiles.forEach((file) => {
        const centralHeaderSize = 46 + file.filenameBytes.length;
        const centralHeader = new Uint8Array(centralHeaderSize);
        
        let pos = 0;
        // Signature "PK\x01\x02"
        writeLE32(centralHeader, pos, 0x02014b50); pos += 4;
        // Version made by
        writeLE16(centralHeader, pos, 20); pos += 2;
        // Version needed to extract
        writeLE16(centralHeader, pos, 20); pos += 2;
        // General purpose bit flag
        writeLE16(centralHeader, pos, 0); pos += 2;
        // Compression method
        writeLE16(centralHeader, pos, 0); pos += 2;
        // Last mod time
        writeLE16(centralHeader, pos, 0); pos += 2;
        // Last mod date
        writeLE16(centralHeader, pos, 0x21); pos += 2;
        // CRC-32
        writeLE32(centralHeader, pos, file.crc32); pos += 4;
        // Compressed size
        writeLE32(centralHeader, pos, file.contentBytes.length); pos += 4;
        // Uncompressed size
        writeLE32(centralHeader, pos, file.contentBytes.length); pos += 4;
        // Filename length
        writeLE16(centralHeader, pos, file.filenameBytes.length); pos += 2;
        // Extra field length
        writeLE16(centralHeader, pos, 0); pos += 2;
        // File comment length
        writeLE16(centralHeader, pos, 0); pos += 2;
        // Disk number start
        writeLE16(centralHeader, pos, 0); pos += 2;
        // Internal file attributes
        writeLE16(centralHeader, pos, 0); pos += 2;
        // External file attributes
        writeLE32(centralHeader, pos, 0); pos += 4;
        // Relative offset of local header
        writeLE32(centralHeader, pos, file.offset); pos += 4;
        // Filename
        centralHeader.set(file.filenameBytes, pos);
        
        centralHeaders.push(centralHeader);
        centralDirSize += centralHeaderSize;
    });
    
    // End of central directory
    const endCentralDir = new Uint8Array(22);
    let pos = 0;
    // Signature "PK\x05\x06"
    writeLE32(endCentralDir, pos, 0x06054b50); pos += 4;
    // Number of this disk
    writeLE16(endCentralDir, pos, 0); pos += 2;
    // Disk where central directory starts
    writeLE16(endCentralDir, pos, 0); pos += 2;
    // Number of central directory entries on this disk
    writeLE16(endCentralDir, pos, fileEntries.length); pos += 2;
    // Total number of central directory entries
    writeLE16(endCentralDir, pos, fileEntries.length); pos += 2;
    // Size of central directory
    writeLE32(endCentralDir, pos, centralDirSize); pos += 4;
    // Offset of start of central directory
    writeLE32(endCentralDir, pos, centralDirStart); pos += 4;
    // Comment length
    writeLE16(endCentralDir, pos, 0);
    
    // Assemble final ZIP file
    const totalSize = totalLocalSize + centralDirSize + 22;
    const zipFile = new Uint8Array(totalSize);
    let zipPos = 0;
    
    // Write local files
    localFiles.forEach((file) => {
        zipFile.set(file.header, zipPos);
        zipPos += file.header.length;
        zipFile.set(file.contentBytes, zipPos);
        zipPos += file.contentBytes.length;
    });
    
    // Write central directory
    centralHeaders.forEach((header) => {
        zipFile.set(header, zipPos);
        zipPos += header.length;
    });
    
    // Write end of central directory
    zipFile.set(endCentralDir, zipPos);
    
    return zipFile;
}