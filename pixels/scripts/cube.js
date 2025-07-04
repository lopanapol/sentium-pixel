// Three.js Pixel Pet Cube - Updated: 2025-06-20 14:30:00 (Cache Bust)
// Three.js setup
const scene = new THREE.Scene();

// Get the canvas element first
const canvas = document.getElementById('three-canvas');

// Use canvas dimensions for proper aspect ratio
const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.01, 1000);
const renderer = new THREE.WebGLRenderer({ 
    canvas: canvas,
    alpha: true,
    antialias: true
});

// Enable shadows for better lighting
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Set canvas to fullscreen
renderer.setSize(canvas.clientWidth, canvas.clientHeight);
renderer.setClearColor(0x000000, 0); // Transparent background

// Initialize database
const cubeDB = new CubeDB();
let currentCubeData = null;

// CUBE GROWTH SYSTEM - Cell Division Implementation
let cubeGrowthSystem = {
    isInteracting: false,
    interactionStartTime: 0,
    growthThreshold: 1000, // 1 second in milliseconds (reduced from 2000)
    cubeGeneration: 0, // 0 = 1 cube, 1 = 2 cubes, 2 = 4 cubes, etc.
    allCubes: [], // Array to store all cube meshes
    maxGeneration: 0, // Will be set from saved data or randomly generated (2-20)
    baseSize: 0, // Will be set from saved data or randomly generated (0.01-1.0)
    hasGrown: false, // Track if growth has occurred during current interaction
    lastGrowthTime: 0, // Prevent rapid successive growths
    growthCooldown: 500, // 0.5 second cooldown between growths (reduced from 1000)
    organismGroup: null // Single group that contains all cubes as one organism
};

// Consciousness simulation variables (initialize early)
const mouse = new THREE.Vector2();
const cubePersonality = {
    curiosity: Math.random() * 0.5 + 0.3, // 0.3-0.8
    shyness: Math.random() * 0.4 + 0.1,   // 0.1-0.5
    playfulness: Math.random() * 0.6 + 0.2, // 0.2-0.8
    attention: 0,
    mood: 0.5, // 0 = sad, 1 = happy
    energy: Math.random() * 0.5 + 0.5 // 0.5-1.0
};

let mousePresent = false;
let mouseStillTime = 0;
let lastMouseMove = 0;
let cubeState = 'idle'; // idle, curious, shy, playful, excited
let targetPosition = new THREE.Vector3(0, 0, 0);
let targetRotationSpeed = 0.01;
let currentRotationSpeed = 0.01;
let velocity = new THREE.Vector2(0, 0); // Add velocity for smoother movement
let consciousness = {
    focus: new THREE.Vector2(0, 0),
    interest: 0,
    lastInteraction: Date.now()
};

// Function to return white color (no longer random)
function getWhiteColor() {
    // Always return white color
    return 0xffffff;
}

// Function to get color based on emotional state
function getEmotionalColor(mood, state) {
    // Base colors for different emotional states
    const emotionalColors = {
        happy: 0x00ff88,      // Bright green
        content: 0x88ff00,    // Light green  
        neutral: 0xffffff,    // White
        sad: 0x4488ff,        // Blue
        anxious: 0xff4444,    // Red
        curious: 0xffaa00,    // Orange
        shy: 0xaa88ff,        // Light purple
        playful: 0xff00ff,    // Magenta
        excited: 0xffff00     // Yellow
    };
    
    // Determine primary emotion based on mood value
    let primaryEmotion;
    if (mood > 0.8) primaryEmotion = 'happy';
    else if (mood > 0.6) primaryEmotion = 'content';
    else if (mood > 0.4) primaryEmotion = 'neutral';
    else if (mood > 0.2) primaryEmotion = 'sad';
    else primaryEmotion = 'anxious';
    
    // Override with state-specific colors if in special states
    if (state === 'happy') primaryEmotion = 'happy';
    else if (state === 'curious') primaryEmotion = 'curious';
    else if (state === 'shy') primaryEmotion = 'shy';
    else if (state === 'playful') primaryEmotion = 'playful';
    else if (state === 'excited') primaryEmotion = 'excited';
    
    return emotionalColors[primaryEmotion] || emotionalColors.neutral;
}

// Create cube geometry and materials (color will be set based on emotions)
let geometry; // Will be created after baseSize is determined
let material = new THREE.MeshPhongMaterial({ 
    color: 0xffffff, // Initial white, will be updated by emotions
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    shininess: 80,
    specular: 0x444444,
    emissive: 0x111111,
    emissiveIntensity: 0.2
});

// Create edges for outline (color will be set dynamically)
let edges; // Will be created after geometry is determined
let edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
let wireframe; // Will be created after edges are determined

// Function to update edge color based on surface color
function updateEdgeColor(surfaceColor) {
    // Extract RGB components
    const r = (surfaceColor >> 16) & 255;
    const g = (surfaceColor >> 8) & 255;
    const b = surfaceColor & 255;
    
    // Make darker by reducing each component by 40%
    const darkR = Math.floor(r * 0.6);
    const darkG = Math.floor(g * 0.6);
    const darkB = Math.floor(b * 0.6);
    
    // Convert back to hex
    const darkerColor = (darkR << 16) | (darkG << 8) | darkB;
    
    // Update the edge material color
    wireframe.material.color.setHex(darkerColor);
}

// Create cube group
const cubeGroup = new THREE.Group();
let cube; // Will be created after geometry is determined

// Create the organism group that will contain all cubes as one body
cubeGrowthSystem.organismGroup = new THREE.Group();
scene.add(cubeGrowthSystem.organismGroup);

// Function to create a new cube with the same appearance as the original
function createNewCube(position, generation) {
    const newGeometry = new THREE.BoxGeometry(
        cubeGrowthSystem.baseSize, 
        cubeGrowthSystem.baseSize, 
        cubeGrowthSystem.baseSize
    );
    
    const newMaterial = new THREE.MeshPhongMaterial({ 
        color: cube.material.color.getHex(),
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        shininess: 80,
        specular: 0x444444,
        emissive: 0x111111,
        emissiveIntensity: 0.2
    });
    
    const newCube = new THREE.Mesh(newGeometry, newMaterial);
    newCube.castShadow = true;
    newCube.receiveShadow = true;
    
    // Create wireframe for the new cube
    const newEdges = new THREE.EdgesGeometry(newGeometry);
    const newEdgeMaterial = new THREE.LineBasicMaterial({ 
        color: wireframe.material.color.getHex()
    });
    const newWireframe = new THREE.LineSegments(newEdges, newEdgeMaterial);
    
    // Create group for the new cube
    const newCubeGroup = new THREE.Group();
    newCubeGroup.add(newCube);
    newCubeGroup.add(newWireframe);
    newCubeGroup.position.copy(position);
    
    // Add to the organism group instead of scene - this makes them move as one body
    cubeGrowthSystem.organismGroup.add(newCubeGroup);
    
    // Play spawn sound for new cubes
    if (window.retroAudio && generation > 0) {
        window.retroAudio.playCubeSpawn();
    }
    
    // Add to cubes array
    cubeGrowthSystem.allCubes.push({
        mesh: newCube,
        group: newCubeGroup,
        wireframe: newWireframe,
        targetPosition: position.clone(),
        velocity: new THREE.Vector3(0, 0, 0),
        generation: generation
    });
    
    return newCubeGroup;
}

// Function to trigger cube growth (cell division)
function triggerCubeGrowth() {
    const currentTime = Date.now();
    
    // Check cooldown
    if (currentTime - cubeGrowthSystem.lastGrowthTime < cubeGrowthSystem.growthCooldown) {
        return;
    }
    
    // Check if we've reached max generation
    if (cubeGrowthSystem.cubeGeneration >= cubeGrowthSystem.maxGeneration) {
        return;
    }
    
    const currentCubeCount = cubeGrowthSystem.allCubes.length;
    const targetCubeCount = Math.pow(2, cubeGrowthSystem.cubeGeneration + 1);
    
    // Create new cubes to reach the target count (connected as one body)
    for (let i = currentCubeCount; i < targetCubeCount; i++) {
        // Find a parent cube to attach to (prefer most recent ones)
        const parentIndex = Math.floor((i - 1) / 2); // Binary tree structure
        const parentCube = cubeGrowthSystem.allCubes[parentIndex];
        
        // Calculate position adjacent to parent cube (touching sides)
        const cubeSize = cubeGrowthSystem.baseSize;
        const directions = [
            new THREE.Vector3(cubeSize, 0, 0),      // Right
            new THREE.Vector3(-cubeSize, 0, 0),     // Left
            new THREE.Vector3(0, cubeSize, 0),      // Up
            new THREE.Vector3(0, -cubeSize, 0),     // Down
            new THREE.Vector3(0, 0, cubeSize),      // Front
            new THREE.Vector3(0, 0, -cubeSize)      // Back
        ];
        
        // Find the best direction that creates a connected body structure
        let bestPosition = null;
        let minDistance = Infinity;
        
        for (const direction of directions) {
            const testPosition = parentCube.group.position.clone().add(direction);
            
            // Check if this position is already occupied by existing cubes
            let occupied = false;
            let totalDistance = 0;
            
            for (const existingCube of cubeGrowthSystem.allCubes) {
                const distance = testPosition.distanceTo(existingCube.group.position);
                totalDistance += distance;
                
                // If position is exactly where another cube is (connected body), skip this direction
                if (distance < cubeSize * 0.1) {
                    occupied = true;
                    break;
                }
            }
            
            // Prefer positions that create tight clustering for unified body appearance
            if (!occupied && totalDistance < minDistance) {
                minDistance = totalDistance;
                bestPosition = testPosition;
            }
        }
        
        // If no perfect adjacent position found, find the closest valid position to maintain body unity
        if (!bestPosition) {
            // Try smaller offsets first to maintain tight body structure
            const smallDirections = directions.map(dir => dir.clone().multiplyScalar(0.5));
            
            for (const direction of smallDirections) {
                const testPosition = parentCube.group.position.clone().add(direction);
                
                let occupied = false;
                for (const existingCube of cubeGrowthSystem.allCubes) {
                    const distance = testPosition.distanceTo(existingCube.group.position);
                    if (distance < cubeSize * 0.2) {
                        occupied = true;
                        break;
                    }
                }
                
                if (!occupied) {
                    bestPosition = testPosition;
                    break;
                }
            }
            
            // Last resort: slight offset from parent to maintain connection
            if (!bestPosition) {
                const randomDirection = directions[Math.floor(Math.random() * directions.length)];
                bestPosition = parentCube.group.position.clone().add(randomDirection.multiplyScalar(0.8));
            }
        }
        
        createNewCube(bestPosition, cubeGrowthSystem.cubeGeneration + 1);
    }
    
    cubeGrowthSystem.cubeGeneration++;
    cubeGrowthSystem.lastGrowthTime = currentTime;
    cubeGrowthSystem.hasGrown = true;
    
    // Play growth sound
    if (window.retroAudio) {
        window.retroAudio.playCubeGrowth();
        
        // Special sounds for generation milestones
        if (cubeGrowthSystem.cubeGeneration === 3) {
            // Play cluster formation sound when reaching generation 3 (8 cubes)
            setTimeout(() => {
                window.retroAudio.playClusterFormation();
            }, 500);
        }
    }
    
    // Save growth state to database
    saveGrowthState();
    
    console.log(`Cube growth triggered! Generation: ${cubeGrowthSystem.cubeGeneration}, Total cubes: ${cubeGrowthSystem.allCubes.length}`);
}

// Function to save current growth state to database
async function saveGrowthState() {
    if (!currentCubeData) return;
    
    try {
        // Save growth system state
        currentCubeData.growthState = {
            generation: cubeGrowthSystem.cubeGeneration,
            totalCubes: cubeGrowthSystem.allCubes.length,
            cubePositions: cubeGrowthSystem.allCubes.map(cubeData => ({
                position: {
                    x: cubeData.group.position.x,
                    y: cubeData.group.position.y,
                    z: cubeData.group.position.z
                },
                generation: cubeData.generation
            }))
        };
        
        // Save organism position
        currentCubeData.position = {
            x: cubeGrowthSystem.organismGroup.position.x,
            y: cubeGrowthSystem.organismGroup.position.y,
            z: cubeGrowthSystem.organismGroup.position.z
        };
        
        // Save organism rotation
        currentCubeData.rotation = {
            x: cubeGrowthSystem.organismGroup.rotation.x,
            y: cubeGrowthSystem.organismGroup.rotation.y,
            z: cubeGrowthSystem.organismGroup.rotation.z
        };
        
        await cubeDB.updateCube(currentCubeData);
        console.log('Growth state saved to database');
    } catch (error) {
        console.error('Error saving growth state:', error);
    }
}

// Function to restore growth state from database
function restoreGrowthState(cubeData) {
    if (!cubeData.growthState) return;
    
    try {
        const growthState = cubeData.growthState;
        
        // Clear existing cubes except the first one (main cube)
        while (cubeGrowthSystem.allCubes.length > 1) {
            const cubeToRemove = cubeGrowthSystem.allCubes.pop();
            cubeGrowthSystem.organismGroup.remove(cubeToRemove.group);
        }
        
        // Restore growth generation
        cubeGrowthSystem.cubeGeneration = growthState.generation || 0;
        
        // Recreate all cubes from saved positions
        if (growthState.cubePositions && growthState.cubePositions.length > 1) {
            // Skip the first position (main cube) and recreate the rest
            for (let i = 1; i < growthState.cubePositions.length; i++) {
                const savedCube = growthState.cubePositions[i];
                const position = new THREE.Vector3(
                    savedCube.position.x,
                    savedCube.position.y,
                    savedCube.position.z
                );
                createNewCube(position, savedCube.generation || 0);
            }
        }
        
        console.log(`Restored growth state: Generation ${cubeGrowthSystem.cubeGeneration}, ${cubeGrowthSystem.allCubes.length} cubes`);
    } catch (error) {
        console.error('Error restoring growth state:', error);
    }
}

// Function to update all cube colors when emotional state changes
function updateAllCubeColors(color) {
    // Don't update colors if disco mode is active
    if (discoSystem.isActive) return;
    
    cubeGrowthSystem.allCubes.forEach(cubeData => {
        cubeData.mesh.material.color.setHex(color);
        
        // Update edge color for each cube's wireframe
        const r = (color >> 16) & 255;
        const g = (color >> 8) & 255;
        const b = color & 255;
        
        // Make darker by reducing each component by 40%
        const darkR = Math.floor(r * 0.6);
        const darkG = Math.floor(g * 0.6);
        const darkB = Math.floor(b * 0.6);
        
        // Convert back to hex
        const darkerColor = (darkR << 16) | (darkG << 8) | darkB;
        
        // Update the edge material color for this cube
        cubeData.wireframe.material.color.setHex(darkerColor);
    });
}

// Function to update all cubes with unified body movement (moves as single organism)
function updateCubeGroupMovement() {
    const time = Date.now() * 0.001;
    
    // Unified organism movement - all cubes move together as one body
    const movementCycle = time * 0.2; // 0.2 = 1 complete cycle per 5 seconds
    
    // Single organism movement pattern
    const baseMovementIntensity = 0.03;
    
    // Unified organism group movement - all cubes move together
    const organismMovement = new THREE.Vector3(
        Math.sin(movementCycle * 0.6) * baseMovementIntensity,
        Math.cos(movementCycle * 0.4) * baseMovementIntensity,
        0
    );
    
    // Apply unified movement to entire organism group
    cubeGrowthSystem.organismGroup.position.add(organismMovement.multiplyScalar(0.016));
    
    // Unified organism rotation - entire body rotates together
    cubeGrowthSystem.organismGroup.rotation.y += Math.sin(time * 0.2) * 0.0008;
    
    // Individual cube movements within the unified body - minimal relative motion
    cubeGrowthSystem.allCubes.forEach((cubeData, index) => {
        const phaseOffset = index * 0.3;
        const subtleMovementIntensity = 0.02; // Much smaller individual movement
        
        // Subtle individual movement within the unified body based on emotional state
        let individualMovement = new THREE.Vector3(0, 0, 0);
        let rotationSpeed = { x: 0, y: 0, z: 0 };
        
        switch (cubeState) {
            case 'excited':
                // Excited: slight vibration within the unified body
                individualMovement.x = Math.sin(movementCycle * 4 + phaseOffset) * subtleMovementIntensity * 0.5;
                individualMovement.y = Math.cos(movementCycle * 3.5 + phaseOffset) * subtleMovementIntensity * 0.3;
                individualMovement.z = Math.sin(movementCycle * 3 + phaseOffset) * subtleMovementIntensity * 0.2;
                
                rotationSpeed.x = 0.008 + Math.sin(time * 2 + phaseOffset) * 0.01;
                rotationSpeed.y = 0.006 + Math.cos(time * 1.8 + phaseOffset) * 0.008;
                rotationSpeed.z = 0.004 + Math.sin(time * 1.5 + phaseOffset) * 0.006;
                break;
                
            case 'happy':
            case 'curious':
            case 'playful':
                // Happy states: gentle synchronized movement within body
                individualMovement.x = Math.sin(movementCycle + phaseOffset) * subtleMovementIntensity * 0.3;
                individualMovement.y = Math.sin(movementCycle * 1.2 + phaseOffset) * subtleMovementIntensity * 0.2;
                individualMovement.z = Math.cos(movementCycle * 0.8 + phaseOffset) * subtleMovementIntensity * 0.1;
                
                rotationSpeed.x = 0.004 + Math.sin(time * 1.2 + phaseOffset) * 0.005;
                rotationSpeed.y = 0.005 + Math.cos(time + phaseOffset) * 0.006;
                rotationSpeed.z = 0.003 + Math.sin(time * 0.8 + phaseOffset) * 0.004;
                break;
                
            case 'shy':
                // Shy: cubes huddle closer together within the body
                const centerPull = 0.03;
                individualMovement.x = -cubeData.group.position.x * centerPull + Math.sin(movementCycle * 0.5 + phaseOffset) * subtleMovementIntensity * 0.2;
                individualMovement.y = -cubeData.group.position.y * centerPull + Math.cos(movementCycle * 0.4 + phaseOffset) * subtleMovementIntensity * 0.2;
                individualMovement.z = Math.sin(movementCycle * 0.3 + phaseOffset) * subtleMovementIntensity * 0.1;
                
                rotationSpeed.x = 0.002 + Math.sin(time * 0.6 + phaseOffset) * 0.003;
                rotationSpeed.y = 0.003 + Math.cos(time * 0.4 + phaseOffset) * 0.004;
                rotationSpeed.z = 0.001 + Math.sin(time * 0.8 + phaseOffset) * 0.002;
                break;
                
            case 'idle':
            default:
                // Idle: minimal movement, maintaining tight body formation
                individualMovement.x = Math.sin(movementCycle * 0.6 + phaseOffset) * subtleMovementIntensity * 0.3;
                individualMovement.y = Math.cos(movementCycle * 0.5 + phaseOffset) * subtleMovementIntensity * 0.2;
                individualMovement.z = Math.sin(movementCycle * 0.4 + phaseOffset) * subtleMovementIntensity * 0.1;
                
                rotationSpeed.x = 0.003 + Math.sin(time * 0.8 + phaseOffset) * 0.004;
                rotationSpeed.y = 0.002 + Math.cos(time * 0.6 + phaseOffset) * 0.005;
                rotationSpeed.z = 0.002 + Math.sin(time + phaseOffset) * 0.003;
                break;
        }
        
        // Apply very subtle individual movement relative to target position within unified body
        cubeData.group.position.copy(cubeData.targetPosition);
        cubeData.group.position.add(individualMovement);
        
        // Apply subtle individual rotations within the unified body
        cubeData.group.rotation.x += rotationSpeed.x;
        cubeData.group.rotation.y += rotationSpeed.y;
        cubeData.group.rotation.z += rotationSpeed.z;
        
        // Strong cohesion - keep cubes tightly connected as one body
        const maxDistance = 0.08; // Much tighter formation
        const distanceFromTarget = cubeData.group.position.distanceTo(cubeData.targetPosition);
        if (distanceFromTarget > maxDistance) {
            // Strong spring-back to maintain unified body structure
            const pullStrength = 0.15; // Stronger pull back
            const direction = cubeData.targetPosition.clone().sub(cubeData.group.position).normalize();
            cubeData.group.position.add(direction.multiplyScalar(pullStrength));
        }
        
        // Keep individual cubes very close to their target positions within the body
        const maxIndividualDistance = 0.1; // Much tighter bounds
        const distanceFromOrigin = cubeData.group.position.length();
        if (distanceFromOrigin > maxIndividualDistance) {
            cubeData.group.position.normalize().multiplyScalar(maxIndividualDistance);
        }
    });
    
    // Keep the entire unified organism within screen bounds
    const maxX = 0.6;
    const maxY = 0.4;
    cubeGrowthSystem.organismGroup.position.x = Math.max(-maxX, Math.min(maxX, cubeGrowthSystem.organismGroup.position.x));
    cubeGrowthSystem.organismGroup.position.y = Math.max(-maxY, Math.min(maxY, cubeGrowthSystem.organismGroup.position.y));
    
    // Unified breathing effect for the entire organism
    if (cubeGrowthSystem.allCubes.length > 1) {
        const breathingScale = 1 + Math.sin(time * 0.8) * 0.003; // Very subtle unified breathing
        cubeGrowthSystem.organismGroup.scale.setScalar(breathingScale);
    }
}

// Initialize current cube data (will be loaded or created)
currentCubeData = null;

// Initialize database and load/create cube
async function initAndLoadCube() {
    try {
        await cubeDB.init();
        
        // Try to load existing cube data
        const existingCubes = await cubeDB.getAllCubes();
        
        if (existingCubes.length > 0) {
            // Load the most recent cube
            currentCubeData = existingCubes[existingCubes.length - 1];
            // Convert date string back to Date object if needed
            if (typeof currentCubeData.created === 'string') {
                currentCubeData.created = new Date(currentCubeData.created);
            }
            
            // Use saved random values (they can't be changed for existing pets)
            cubeGrowthSystem.maxGeneration = 0; // Force to 0 for single cube
            cubeGrowthSystem.baseSize = 0.15; // Force to 0.15
            
            // If genetics don't exist in saved data, save them now
            if (!currentCubeData.genetics) {
                currentCubeData.genetics = {
                    maxGeneration: 0, // Force to 0 for single cube
                    baseSize: 0.15 // Force to 0.15
                };
                await cubeDB.updateCube(currentCubeData);
            }
            
            // Initialize the main cube with the determined size
            initializeMainCube();
            
            // Set cube color based on initial emotional state
            const initialColor = getEmotionalColor(cubePersonality.mood, cubeState);
            currentEmotionalColor = initialColor;
            targetEmotionalColor = initialColor;
            cube.material.color.setHex(initialColor);
            updateEdgeColor(initialColor);
            
            // Apply loaded rotation if exists
            if (currentCubeData.rotation) {
                cubeGrowthSystem.organismGroup.rotation.x = currentCubeData.rotation.x;
                cubeGrowthSystem.organismGroup.rotation.y = currentCubeData.rotation.y;
                cubeGrowthSystem.organismGroup.rotation.z = currentCubeData.rotation.z;
            }
            
            // Apply loaded position if exists
            if (currentCubeData.position) {
                cubeGrowthSystem.organismGroup.position.x = currentCubeData.position.x;
                cubeGrowthSystem.organismGroup.position.y = currentCubeData.position.y;
                cubeGrowthSystem.organismGroup.position.z = currentCubeData.position.z;
            }
            
            // Restore growth state (recreate additional cubes)
            restoreGrowthState(currentCubeData);
            
            console.log(`Loaded existing cube from IndexedDB. Max Gen: ${cubeGrowthSystem.maxGeneration}, Size: ${cubeGrowthSystem.baseSize.toFixed(3)}`, currentCubeData);
        } else {
            // No existing cube, create new one with random genetics
            cubeGrowthSystem.maxGeneration = 0; // Force to 0 for single cube
            cubeGrowthSystem.baseSize = 0.15; // Force to 0.15
            
            // Initialize the main cube with the new random size
            initializeMainCube();
            
            currentCubeData = {
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                created: new Date(),
                name: `${Date.now()}`,
                genetics: {
                    maxGeneration: 0, // Force to 0 for single cube
                    baseSize: 0.15 // Force to 0.15
                },
                growthState: {
                    generation: 0,
                    totalCubes: 1,
                    cubePositions: [{
                        position: { x: 0, y: 0, z: 0 },
                        generation: 0
                    }]
                }
            };
            
            // Apply emotional color to the cube
            const initialColor = getEmotionalColor(cubePersonality.mood, cubeState);
            currentEmotionalColor = initialColor;
            targetEmotionalColor = initialColor;
            cube.material.color.setHex(initialColor);
            updateEdgeColor(initialColor);
            
            // Save the new cube
            await cubeDB.saveCube(currentCubeData);
            console.log(`Created new cube with random genetics. Max Gen: ${cubeGrowthSystem.maxGeneration}, Size: ${cubeGrowthSystem.baseSize.toFixed(3)}`, currentCubeData);
        }
        
        updateDataDisplay();
    } catch (error) {
        console.error('Error loading/saving cube:', error);
    }
}

// Function to update data display (without color and position/rotation)
function updateDataDisplay() {
    if (!currentCubeData) return;
    
    const cubeInfo = document.getElementById('cube-info');
    
    // Get emotional state description
    const getMoodDescription = () => {
        if (cubePersonality.mood > 0.8) return "Happy";
        if (cubePersonality.mood > 0.6) return "Content";
        if (cubePersonality.mood > 0.4) return "Neutral";
        if (cubePersonality.mood > 0.2) return "Sad";
        return "Anxious";
    };
    
    const getStateDescription = () => {
        switch (cubeState) {
            case 'curious': return "Curious";
            case 'happy': return "Happy";
            case 'shy': return "Shy";
            case 'playful': return "Playful";
            case 'excited': return "Excited";
            default: return "Idle";
        }
    };
    
    // Format date as "2 Jan 2025"
    const formatCreatedDate = (date) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    };

    // Format time as "2:01:10 PM"
    const formatCreatedTime = (date) => {
        return date.toLocaleTimeString();
    };

    // Calculate age from creation date
    const calculateAge = (createdDate) => {
        const now = new Date();
        const diffMs = now - createdDate;
        
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffDays > 0) {
            return `${diffDays} day${diffDays === 1 ? '' : 's'}`;
        } else if (diffHours > 0) {
            return `${diffHours} hour${diffHours === 1 ? '' : 's'}`;
        } else if (diffMinutes > 0) {
            return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'}`;
        } else {
            return `${diffSeconds} second${diffSeconds === 1 ? '' : 's'}`;
        }
    };
    
    cubeInfo.innerHTML = `
        <div><strong>ID:</strong> ${currentCubeData.name}</div>
        <div><strong>Mood:</strong> ${getMoodDescription()}</div>
        <div><strong>State:</strong> ${getStateDescription()}</div>
        <div><strong>Max Gen:</strong> ${cubeGrowthSystem.maxGeneration} (${Math.pow(2, cubeGrowthSystem.maxGeneration)} cubes)</div>
        <div><strong>Size:</strong> ${cubeGrowthSystem.baseSize.toFixed(3)}</div>
        <div><strong>Born:</strong> ${formatCreatedDate(currentCubeData.created)}</div>
        <div><strong>Time:</strong> ${formatCreatedTime(currentCubeData.created)}</div>
        <div><strong>Age:</strong> ${calculateAge(currentCubeData.created)}</div>
    `;
}

// Function to initialize the main cube with the determined size
function initializeMainCube() {
    // Create geometry with the determined base size
    geometry = new THREE.BoxGeometry(cubeGrowthSystem.baseSize, cubeGrowthSystem.baseSize, cubeGrowthSystem.baseSize);
    
    // Create cube mesh
    cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    cube.receiveShadow = true;
    
    // Create wireframe
    edges = new THREE.EdgesGeometry(geometry);
    wireframe = new THREE.LineSegments(edges, edgeMaterial);
    
    // Add to cube group
    cubeGroup.add(cube);
    cubeGroup.add(wireframe);
    cubeGroup.position.set(0, 0, 0);
    
    // Add cube group to organism
    cubeGrowthSystem.organismGroup.add(cubeGroup);
    
    // Initialize cubes array with the main cube
    cubeGrowthSystem.allCubes.push({
        mesh: cube,
        group: cubeGroup,
        wireframe: wireframe,
        targetPosition: new THREE.Vector3(0, 0, 0),
        velocity: new THREE.Vector3(0, 0, 0),
        generation: 0
    });
}

// Add a subtle invisible ground plane for shadows (moved further down to avoid clipping)
const groundGeometry = new THREE.PlaneGeometry(10, 10);
const groundMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x000000, 
    transparent: true, 
    opacity: 0,
    side: THREE.DoubleSide
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -3; // Moved further down from -1 to -3 to prevent clipping
ground.receiveShadow = true;
scene.add(ground);

// Add comprehensive lighting system
const ambientLight = new THREE.AmbientLight(0x404040, 0.4); // Soft ambient light
scene.add(ambientLight);

// Main directional light
const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
mainLight.position.set(2, 2, 1);
mainLight.castShadow = true;

// Configure shadow properties for better quality
mainLight.shadow.mapSize.width = 1024;
mainLight.shadow.mapSize.height = 1024;
mainLight.shadow.camera.near = 0.1;
mainLight.shadow.camera.far = 50;
mainLight.shadow.camera.left = -3;
mainLight.shadow.camera.right = 3;
mainLight.shadow.camera.top = 3;
mainLight.shadow.camera.bottom = -4; // Extend bottom bounds to prevent shadow clipping
mainLight.shadow.bias = -0.0001;

scene.add(mainLight);

// Point light that follows mouse for interactive lighting
const mouseLight = new THREE.PointLight(0xff4080, 0.6, 3);
mouseLight.position.set(0, 0, 1);
scene.add(mouseLight);

// Emotional light that changes with cube's mood
const emotionalLight = new THREE.PointLight(0xffffff, 0.5, 2);
emotionalLight.position.set(0, 0, 0.5);
scene.add(emotionalLight);

// Rim light for dramatic effect
const rimLight = new THREE.DirectionalLight(0x4080ff, 0.3);
rimLight.position.set(-1, -1, 1);
scene.add(rimLight);

// Position camera (closer for smaller pixel cube)
camera.position.z = 2;

// Mouse tracking for consciousness
// Mouse tracking for consciousness - Enhanced awareness
function onMouseMove(event) {
    // Normalize mouse coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    mousePresent = true;
    lastMouseMove = Date.now();
    mouseStillTime = 0;
    
    // UPDATE DISCO SYSTEM
    checkCursorOnCube(event);
    
    // Play subtle mouse movement sound occasionally
    if (Math.random() < 0.005 && window.retroAudio) {
        window.retroAudio.playMouseMove();
    }
    
    // Calculate distance from cube center for proximity detection
    const mouseToCubeDistance = Math.sqrt(mouse.x * mouse.x + mouse.y * mouse.y);
    const interactionRange = 0.4; // Same range as in trackMouseInteractions
    
    // Start interaction tracking only if mouse is close to the cube
    if (mouseToCubeDistance <= interactionRange) {
        if (!cubeGrowthSystem.isInteracting) {
            cubeGrowthSystem.isInteracting = true;
            cubeGrowthSystem.interactionStartTime = Date.now();
            cubeGrowthSystem.hasGrown = false;
        }
    } else {
        // Mouse moved away from cube area, stop interaction tracking
        if (cubeGrowthSystem.isInteracting) {
            cubeGrowthSystem.isInteracting = false;
            cubeGrowthSystem.interactionStartTime = 0;
            cubeGrowthSystem.hasGrown = false;
        }
    }
    
    // Calculate distance from cube center for awareness
    const distanceFromCube = Math.sqrt(mouse.x * mouse.x + mouse.y * mouse.y);
    
    // Enhanced consciousness response based on distance and movement
    consciousness.focus.x = mouse.x;
    consciousness.focus.y = mouse.y;
    
    // Gradual interest buildup - closer = more interested
    if (distanceFromCube < 0.1) {
        // Very close - high interest and excitement
        consciousness.interest = Math.min(consciousness.interest + 0.05, 1.0);
        cubePersonality.mood = Math.min(cubePersonality.mood + 0.02, 1.0);
    } else if (distanceFromCube < 0.2) {
        // Medium distance - moderate interest
        consciousness.interest = Math.min(consciousness.interest + 0.03, 0.8);
        cubePersonality.mood = Math.min(cubePersonality.mood + 0.01, 0.9);
    } else {
        // Far away - mild interest
        consciousness.interest = Math.min(consciousness.interest + 0.01, 0.5);
    }
    
    consciousness.lastInteraction = Date.now();
    
    // Determine cube's reaction based on personality and distance
    updateCubeState();
    
    // Add subtle "noticing" behavior when cursor first appears
    if (!mousePresent || Date.now() - consciousness.lastInteraction > 5000) {
        // Cube "notices" the cursor - slight startle effect
        cubePersonality.attention = 1.0;
    }
}

function onMouseLeave() {
    mousePresent = false;
    consciousness.interest = Math.max(consciousness.interest - 0.15, 0);
    // Cube feels "lonely" when cursor leaves
    cubePersonality.mood = Math.max(cubePersonality.mood - 0.1, 0.3);
    cubeState = 'idle';
    
    // End interaction tracking
    cubeGrowthSystem.isInteracting = false;
    cubeGrowthSystem.interactionStartTime = 0;
}

function onMouseEnter() {
    mousePresent = true;
    consciousness.interest = 0.9; // Very excited to see cursor return
    // Immediate happy reaction when cursor appears - like seeing a friend
    cubePersonality.mood = Math.min(cubePersonality.mood + 0.4, 1.0);
    cubePersonality.attention = 1.0;
    
    // Start interaction tracking
    cubeGrowthSystem.isInteracting = true;
    cubeGrowthSystem.interactionStartTime = Date.now();
    cubeGrowthSystem.hasGrown = false;
    
    // Small "startle" then recognition behavior
    setTimeout(() => {
        if (mousePresent) cubeState = 'excited';
    }, 100);
}

// Enhanced cube consciousness state machine
function updateCubeState() {
    const timeSinceLastMove = Date.now() - lastMouseMove;
    const distanceFromCenter = Math.sqrt(mouse.x * mouse.x + mouse.y * mouse.y);
    
    if (!mousePresent) {
        // Gradual mood decline when alone
        cubePersonality.mood = Math.max(cubePersonality.mood - 0.001, 0.2);
        cubeState = 'idle';
        return;
    }
    
    // Cube "watches" and reacts based on cursor behavior
    if (timeSinceLastMove > 2000) {
        // Cursor hasn't moved - cube gets curious/concerned
        mouseStillTime += 16; // Approximate frame time
        if (mouseStillTime > 3000) {
            cubeState = distanceFromCenter < 0.4 ? 'curious' : 'idle';
        }
    } else {
        mouseStillTime = 0;
    }
    
    // Enhanced emotional consciousness - cube "thinks" about cursor behavior
    if (timeSinceLastMove < 50) {
        // Very rapid mouse movement = excitement but also slight anxiety
        cubeState = 'excited';
        cubePersonality.attention = 1.0;
    } else if (timeSinceLastMove < 200) {
        // Recent movement = happy following behavior like recognizing a friend
        cubeState = 'happy';
        cubePersonality.mood = Math.min(cubePersonality.mood + 0.005, 1.0);
    } else if (timeSinceLastMove < 500) {
        // Moderate pause = curiosity about what you're doing
        if (distanceFromCenter < 0.3) {
            // Close and still = either shy or very curious depending on personality
            cubeState = cubePersonality.shyness > 0.4 ? 'shy' : 'curious';
            cubePersonality.attention = 0.8;
        } else if (distanceFromCenter < 0.7) {
            // Medium distance = safe curiosity
            cubeState = 'curious';
        } else {
            // Far away = watching from distance
            cubeState = 'idle';
        }
    } else if (timeSinceLastMove < 1500) {
        // Longer pause = cube starts to wonder if you're still there
        cubeState = 'curious';
        cubePersonality.attention = Math.max(cubePersonality.attention - 0.01, 0.3);
    } else {
        // Long pause = cube gets lonely/bored but still hopeful
        cubeState = distanceFromCenter < 0.5 ? 'curious' : 'playful';
        cubePersonality.mood = Math.max(cubePersonality.mood - 0.002, 0.4);
    }
}

// Conscious movement behavior
function updateConsciousBehavior() {
    const time = Date.now() * 0.001;
    
    // Calculate actual world space boundaries based on camera setup
    // With camera at z=2 and FOV=75, we can calculate the visible area
    const fov = 75 * Math.PI / 180; // Convert to radians
    const distance = 2;
    const height = 2 * Math.tan(fov / 2) * distance;
    const width = height * (window.innerWidth / window.innerHeight);
    
    // Use 70% of the visible area to keep cube on screen and avoid ground plane clipping
    const maxX = (width / 2) * 0.7;
    const maxY = (height / 2) * 0.7;
    
    switch (cubeState) {
        case 'curious':
            // Dog-like behavior: follow cursor closely with excitement
            const followDistance = 0.1; // Stay close to cursor like a loyal dog
            const bounceIntensity = Math.sin(time * 8) * 0.15; // Bouncing like excited dog
            const wiggleX = Math.sin(time * 6) * 0.05; // Side-to-side wiggling
            const wiggleY = Math.cos(time * 7) * 0.05;
            
            // Follow cursor directly but with playful offset
            targetPosition.x = mouse.x * maxX * 0.9 + wiggleX + bounceIntensity * 0.3;
            targetPosition.y = mouse.y * maxY * 0.9 + wiggleY + Math.abs(bounceIntensity);
            targetPosition.x = Math.max(-maxX, Math.min(maxX, targetPosition.x));
            targetPosition.y = Math.max(-maxY, Math.min(maxY, targetPosition.y));
            
            targetRotationSpeed = 0.03 + consciousness.interest * 0.02; // More energetic rotation
            cubePersonality.mood = Math.min(cubePersonality.mood + 0.01, 1.0);
            break;
            
        case 'happy':
            // Very happy dog-like behavior: close following with tail-wagging motion
            const tailWag = Math.sin(time * 12) * 0.08; // Fast side-to-side like tail wagging
            const happyBounce = Math.abs(Math.sin(time * 10)) * 0.1; // Happy bouncing
            const circleRadius = 0.15;
            const circleSpeed = time * 4;
            
            // Circle around cursor position like an excited dog
            const circleX = Math.cos(circleSpeed) * circleRadius;
            const circleY = Math.sin(circleSpeed) * circleRadius;
            
            targetPosition.x = mouse.x * maxX * 0.95 + circleX + tailWag;
            targetPosition.y = mouse.y * maxY * 0.95 + circleY + happyBounce;
            targetPosition.x = Math.max(-maxX, Math.min(maxX, targetPosition.x));
            targetPosition.y = Math.max(-maxY, Math.min(maxY, targetPosition.y));
            
            targetRotationSpeed = 0.04; // Happy spinning
            cubePersonality.mood = Math.min(cubePersonality.mood + 0.015, 1.0);
            break;
            
        case 'shy':
            // Move away from mouse to opposite corner
            const avoidX = -mouse.x * maxX * 0.8 + Math.sin(time) * (maxX * 0.2);
            const avoidY = -mouse.y * maxY * 0.8 + Math.cos(time) * (maxY * 0.2);
            targetPosition.x = Math.max(-maxX, Math.min(maxX, avoidX));
            targetPosition.y = Math.max(-maxY, Math.min(maxY, avoidY));
            targetRotationSpeed = 0.003; // Reduced from 0.005
            cubePersonality.mood = Math.max(cubePersonality.mood - 0.002, 0.2);
            break;
            
        case 'playful':
            // Free-roaming energetic movement across the screen
            const playX = Math.sin(time * cubePersonality.playfulness * 2) * maxX * 0.9;
            const playY = Math.cos(time * cubePersonality.playfulness * 1.5) * maxY * 0.9;
            targetPosition.x = playX;
            targetPosition.y = playY;
            targetRotationSpeed = 0.015 * cubePersonality.energy; // Reduced from 0.03
            cubePersonality.mood = Math.min(cubePersonality.mood + 0.01, 1.0);
            break;
            
        case 'excited':
            // Gentle excited movement (reduced from rapid/unpredictable)
            targetPosition.x += (Math.random() - 0.5) * maxX * 0.08; // Reduced from 0.2
            targetPosition.y += (Math.random() - 0.5) * maxY * 0.08; // Reduced from 0.2
            targetPosition.x = Math.max(-maxX, Math.min(maxX, targetPosition.x));
            targetPosition.y = Math.max(-maxY, Math.min(maxY, targetPosition.y));
            targetRotationSpeed = 0.015; // Reduced from 0.025
            cubePersonality.mood = Math.min(cubePersonality.mood + 0.02, 1.0);
            break;
            
        case 'idle':
        default:
            // Gentle wandering movement (slower)
            const wanderX = Math.sin(time * 0.15) * maxX * 0.6 + Math.sin(time * 0.35) * maxX * 0.2; // Reduced time multipliers
            const wanderY = Math.cos(time * 0.12) * maxY * 0.5 + Math.cos(time * 0.3) * maxY * 0.3; // Reduced time multipliers
            targetPosition.x = wanderX;
            targetPosition.y = wanderY;
            targetRotationSpeed = 0.005; // Reduced from 0.01
            cubePersonality.mood = Math.max(cubePersonality.mood - 0.001, 0.3);
            break;
    }
    
    // Update cube mood affects opacity and color
    const moodOpacity = 0.4 + cubePersonality.mood * 0.4;
    cube.material.opacity = moodOpacity;
    
    // Update cube color based on emotional state
    const currentEmotionalColor = getEmotionalColor(cubePersonality.mood, cubeState);
    
    // Update all cubes with the new color
    updateAllCubeColors(currentEmotionalColor);
    
    updateEdgeColor(currentEmotionalColor);
}

// Animation enhancement variables
let animationTime = 0;
let breathingIntensity = 0.02;
let glowIntensity = 0;
let targetGlowIntensity = 0;
let currentEmotionalColor = 0xffffff;
let targetEmotionalColor = 0xffffff;
let colorTransitionSpeed = 0.05;
let trailPositions = [];
let lastTrailTime = 0;

// Enhanced animation functions
function updateBreathingAnimation() {
    // Breathing varies based on emotional state
    const baseBreathing = 0.015;
    const emotionalBreathing = {
        'excited': 0.035,
        'happy': 0.025,
        'curious': 0.02,
        'playful': 0.03,
        'shy': 0.01,
        'idle': 0.015
    };
    
    breathingIntensity = emotionalBreathing[cubeState] || baseBreathing;
    
    // Breathing speed also varies with emotion
    const breathingSpeed = {
        'excited': 0.003,
        'happy': 0.0025,
        'curious': 0.002,
        'playful': 0.0028,
        'shy': 0.0015,
        'idle': 0.0018
    };
    
    const speed = breathingSpeed[cubeState] || 0.002;
    const breathTime = animationTime * speed;
    
    // Apply breathing to each cube individually for more organic effect
    cubeGrowthSystem.allCubes.forEach((cubeData, index) => {
        const phaseOffset = index * 0.3; // Each cube breathes slightly out of sync
        
        // Complex breathing pattern - inhale and exhale with natural rhythm
        const primaryBreath = Math.sin(breathTime + phaseOffset) * breathingIntensity;
        const secondaryBreath = Math.sin((breathTime + phaseOffset) * 1.3) * (breathingIntensity * 0.3);
        const tertiaryBreath = Math.sin((breathTime + phaseOffset) * 2.1) * (breathingIntensity * 0.15);
        
        const totalBreathScale = 1 + primaryBreath + secondaryBreath + tertiaryBreath;
        cubeData.group.scale.setScalar(totalBreathScale);
    });
}

function updateGlowEffect() {
    // Glow intensity based on emotional state and energy
    const glowLevels = {
        'excited': 0.8,
        'happy': 0.6,
        'curious': 0.4,
        'playful': 0.5,
        'shy': 0.1,
        'idle': 0.2
    };
    
    targetGlowIntensity = (glowLevels[cubeState] || 0.2) * cubePersonality.energy;
    
    // Smooth glow transition
    const glowTransitionSpeed = 0.03;
    glowIntensity += (targetGlowIntensity - glowIntensity) * glowTransitionSpeed;
    
    // Apply glow effect through material properties
    cube.material.opacity = 0.7 + (glowIntensity * 0.3);
    
    // Update emissive properties for inner glow
    const emissiveIntensity = glowIntensity * 0.3;
    cube.material.emissiveIntensity = emissiveIntensity;
    
    // Update emotional light intensity and color
    emotionalLight.intensity = 0.3 + (glowIntensity * 0.4);
    emotionalLight.color.setHex(targetEmotionalColor);
    
    // Pulsing glow effect
    const pulseTime = animationTime * 0.004;
    const pulse = Math.sin(pulseTime) * 0.1 + Math.sin(pulseTime * 1.7) * 0.05;
    const finalOpacity = Math.max(0.4, cube.material.opacity + (pulse * glowIntensity));
    cube.material.opacity = Math.min(1.0, finalOpacity);
    
    // Pulse the emissive color
    const pulsedEmissiveIntensity = emissiveIntensity + (pulse * glowIntensity * 0.2);
    cube.material.emissiveIntensity = Math.max(0, Math.min(0.5, pulsedEmissiveIntensity));
    
    // Create sparkle effect for excited/happy states
    if ((cubeState === 'excited' || cubeState === 'happy') && Math.random() < 0.1) {
        createSparkleEffect();
    }
}

function createSparkleEffect() {
    // Create small sparkle lights around the organism
    const sparkleLight = new THREE.PointLight(targetEmotionalColor, 0.8, 0.5);
    
    // Random position around the organism
    const angle = Math.random() * Math.PI * 2;
    const distance = 0.3 + Math.random() * 0.2;
    sparkleLight.position.x = cubeGrowthSystem.organismGroup.position.x + Math.cos(angle) * distance;
    sparkleLight.position.y = cubeGrowthSystem.organismGroup.position.y + Math.sin(angle) * distance;
    sparkleLight.position.z = cubeGrowthSystem.organismGroup.position.z + (Math.random() - 0.5) * 0.3;
    
    scene.add(sparkleLight);
    
    // Animate sparkle
    let sparkleLife = 1.0;
    const animateSparkle = () => {
        sparkleLife -= 0.05;
        sparkleLight.intensity = sparkleLife * 0.8;
        
        if (sparkleLife > 0) {
            requestAnimationFrame(animateSparkle);
        } else {
            scene.remove(sparkleLight);
        }
    };
    animateSparkle();
}

function updateColorTransition() {
    // Get target color based on current emotional state
    targetEmotionalColor = getEmotionalColor(cubePersonality.mood, cubeState);
    
    // Smooth color transition
    if (currentEmotionalColor !== targetEmotionalColor) {
        // Extract RGB components from current and target colors
        const currentR = (currentEmotionalColor >> 16) & 255;
        const currentG = (currentEmotionalColor >> 8) & 255;
        const currentB = currentEmotionalColor & 255;
        
        const targetR = (targetEmotionalColor >> 16) & 255;
        const targetG = (targetEmotionalColor >> 8) & 255;
        const targetB = targetEmotionalColor & 255;
        
        // Interpolate between current and target colors
        const newR = Math.round(currentR + (targetR - currentR) * colorTransitionSpeed);
        const newG = Math.round(currentG + (targetG - currentG) * colorTransitionSpeed);
        const newB = Math.round(currentB + (targetB - currentB) * colorTransitionSpeed);
        
        currentEmotionalColor = (newR << 16) | (newG << 8) | newB;
        
        // Apply the interpolated color to diffuse and emissive
        cube.material.color.setHex(currentEmotionalColor);
        cube.material.emissive.setHex(currentEmotionalColor);
        updateEdgeColor(currentEmotionalColor);
    }
}

function updateTrailEffect() {
    const currentTime = Date.now();
    
    // Add new trail position every 50ms when moving
    if (currentTime - lastTrailTime > 50) {
        const movementSpeed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        
        if (movementSpeed > 0.001) { // Only add trail when actually moving
            trailPositions.push({
                x: cubeGroup.position.x,
                y: cubeGroup.position.y,
                z: cubeGroup.position.z,
                time: currentTime,
                intensity: Math.min(movementSpeed * 10, 1.0)
            });
            
            lastTrailTime = currentTime;
        }
    }
    
    // Remove old trail positions (keep trail for 1 second)
    trailPositions = trailPositions.filter(pos => currentTime - pos.time < 1000);
    
    // TODO: Visual trail rendering will be added in particle effects section
}

function updateLighting() {
    // Update mouse light position to follow cursor
    if (mousePresent) {
        const worldMouse = new THREE.Vector3(
            consciousness.focus.x * 2,
            consciousness.focus.y * 2,
            1
        );
        mouseLight.position.lerp(worldMouse, 0.1);
        
        // Adjust mouse light intensity based on consciousness interest
        mouseLight.intensity = 0.4 + (consciousness.interest * 0.5);
        
        // Change mouse light color based on cube's emotional state
        const mouseColor = new THREE.Color();
        mouseColor.setHex(targetEmotionalColor);
        mouseColor.lerp(new THREE.Color(0xff4080), 0.7); // Mix with pink
        mouseLight.color.copy(mouseColor);
    } else {
        // Fade out mouse light when cursor is away
        mouseLight.intensity = Math.max(0, mouseLight.intensity - 0.02);
    }
    
    // Update emotional light position to cube position
    emotionalLight.position.copy(cubeGrowthSystem.organismGroup.position);
    emotionalLight.position.z += 0.3; // Slightly in front
    
    // Animate main light for dynamic shadows
    const time = Date.now() * 0.0005;
    mainLight.position.x = 2 + Math.sin(time) * 0.5;
    mainLight.position.y = 2 + Math.cos(time * 0.7) * 0.3;
    
    // Update rim light based on cube state
    if (cubeState === 'excited' || cubeState === 'happy') {
        rimLight.intensity = 0.4 + Math.sin(time * 3) * 0.1;
    } else {
        rimLight.intensity = Math.max(0.2, rimLight.intensity - 0.01);
    }
    
    // Update CSS lighting classes
    updateCSSLighting();
}

function updateCSSLighting() {
    const canvas = document.getElementById('three-canvas');
    const ambientGlow = document.getElementById('ambient-glow');
    
    // Remove existing lighting classes
    canvas.classList.remove('excited-lighting', 'happy-lighting', 'curious-lighting');
    ambientGlow.classList.remove('excited', 'happy', 'curious');
    
    // Add appropriate lighting class based on cube state
    switch(cubeState) {
        case 'excited':
            canvas.classList.add('excited-lighting');
            ambientGlow.classList.add('excited');
            break;
        case 'happy':
            canvas.classList.add('happy-lighting');
            ambientGlow.classList.add('happy');
            break;
        case 'curious':
            canvas.classList.add('curious-lighting');
            ambientGlow.classList.add('curious');
            break;
    }
}

// Event listeners
canvas.addEventListener('mousemove', onMouseMove);
canvas.addEventListener('mouseenter', onMouseEnter);
canvas.addEventListener('mouseleave', onMouseLeave);

// Touch event support for mobile devices
let currentTouch = null;

function onTouchStart(event) {
    event.preventDefault();
    if (event.touches.length === 1) {
        currentTouch = event.touches[0];
        // Simulate mouse enter
        onMouseEnter();
        // Simulate mouse move with touch position
        const touchEvent = {
            clientX: currentTouch.clientX,
            clientY: currentTouch.clientY
        };
        onMouseMove(touchEvent);
    }
}

function onTouchMove(event) {
    event.preventDefault();
    if (event.touches.length === 1 && currentTouch) {
        currentTouch = event.touches[0];
        // Simulate mouse move with touch position
        const touchEvent = {
            clientX: currentTouch.clientX,
            clientY: currentTouch.clientY
        };
        onMouseMove(touchEvent);
    }
}

function onTouchEnd(event) {
    event.preventDefault();
    if (event.touches.length === 0) {
        currentTouch = null;
        // Simulate mouse leave
        onMouseLeave();
    }
}

// Add touch event listeners for mobile support
canvas.addEventListener('touchstart', onTouchStart, { passive: false });
canvas.addEventListener('touchmove', onTouchMove, { passive: false });
canvas.addEventListener('touchend', onTouchEnd, { passive: false });
canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });

// Set enhanced cursor style with visibility improvements
canvas.style.cursor = 'none'; // Hide default cursor to replace with custom one

// Create custom visible cursor
const createCustomCursor = () => {
    // Remove existing custom cursor if any
    const existingCursor = document.getElementById('custom-cursor');
    if (existingCursor) existingCursor.remove();
    
    // Create custom cursor element
    const customCursor = document.createElement('div');
    customCursor.id = 'custom-cursor';
    customCursor.style.cssText = `
        position: fixed;
        width: 20px;
        height: 20px;
        background: radial-gradient(circle, rgba(255,105,180,0.9) 0%, rgba(255,20,147,0.7) 50%, rgba(255,105,180,0.3) 100%);
        border: 2px solid rgba(255,20,147,0.8);
        border-radius: 50%;
        pointer-events: none;
        z-index: 10000;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 15px rgba(255,20,147,0.6), inset 0 0 10px rgba(255,105,180,0.4);
        transition: all 0.05s ease;
        mix-blend-mode: normal;
    `;
    document.body.appendChild(customCursor);
    
    // Update cursor position and responsiveness on mouse move
    const updateCursorPosition = (e) => {
        customCursor.style.left = e.clientX + 'px';
        customCursor.style.top = e.clientY + 'px';
        
        // Get actual cube position in screen coordinates
        const vector = new THREE.Vector3();
        cubeGrowthSystem.organismGroup.getWorldPosition(vector);
        vector.project(camera);
        
        // Convert cube's 3D position to screen coordinates
        const rect = canvas.getBoundingClientRect();
        const cubeScreenX = (vector.x * 0.5 + 0.5) * rect.width + rect.left;
        const cubeScreenY = (vector.y * -0.5 + 0.5) * rect.height + rect.top;
        
        // Calculate actual distance from cursor to cube in screen pixels
        const dx = e.clientX - cubeScreenX;
        const dy = e.clientY - cubeScreenY;
        const pixelDistance = Math.sqrt(dx * dx + dy * dy);
        
        // Contact detection based on cube size (approximately 30-40 pixels)
        const cubeRadius = 35; // Adjust this based on cube's visual size
        const isContactingCube = pixelDistance < cubeRadius;
        
        // Also calculate normalized distance for other effects
        const mouseCanvasX = (e.clientX - rect.left) / rect.width * 2 - 1;
        const mouseCanvasY = -((e.clientY - rect.top) / rect.height * 2 - 1);
        const normalizedDistance = Math.sqrt(mouseCanvasX * mouseCanvasX + mouseCanvasY * mouseCanvasY);
        
        if (isContactingCube) {
            // CONTACT EFFECTS - Cursor is actually touching the cube!
            customCursor.style.transform = 'translate(-50%, -50%) scale(2)';
            customCursor.style.background = 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,20,147,1) 30%, rgba(255,105,180,0.8) 70%, rgba(255,20,147,0.3) 100%)';
            customCursor.style.boxShadow = `
                0 0 40px rgba(255,20,147,1), 
                0 0 80px rgba(255,105,180,0.7),
                inset 0 0 20px rgba(255,255,255,0.8),
                0 0 120px rgba(255,20,147,0.5)
            `;
            customCursor.style.border = '4px solid rgba(255,255,255,1)';
            customCursor.style.filter = 'brightness(1.5) saturate(2) blur(0.5px)';
            customCursor.style.animation = 'contactPulse 0.2s ease-in-out infinite alternate';
            customCursor.style.width = '30px';
            customCursor.style.height = '30px';
            
            // Trigger cube contact reaction (with proper positioning)
            if (!cubeGrowthSystem.organismGroup.userData.lastContactTime || Date.now() - cubeGrowthSystem.organismGroup.userData.lastContactTime > 500) {
                triggerCubeContactEffect(cubeScreenX, cubeScreenY);
                cubeGrowthSystem.organismGroup.userData.lastContactTime = Date.now();
            }
            
            // Boost cube's happiness from contact
            cubePersonality.mood = Math.min(cubePersonality.mood + 0.05, 1.0);
            consciousness.interest = 1.0;
            cubePersonality.attention = 1.0;
            
        } else {
            // Normal interaction states when not in contact
            if (consciousness.interest > 0.8) {
                // Very high interest - cursor pulses and grows
                customCursor.style.transform = 'translate(-50%, -50%) scale(1.5)';
                customCursor.style.background = 'radial-gradient(circle, rgba(255,20,147,1) 0%, rgba(255,105,180,0.9) 50%, rgba(255,20,147,0.5) 100%)';
                customCursor.style.boxShadow = '0 0 30px rgba(255,20,147,0.9), inset 0 0 15px rgba(255,105,180,0.7), 0 0 50px rgba(255,20,147,0.4)';
                customCursor.style.border = '3px solid rgba(255,20,147,1)';
                customCursor.style.filter = 'brightness(1.2) saturate(1.3)';
            } else if (consciousness.interest > 0.5) {
                // High interest - cursor grows and brightens
                customCursor.style.transform = 'translate(-50%, -50%) scale(1.3)';
                customCursor.style.background = 'radial-gradient(circle, rgba(255,20,147,0.95) 0%, rgba(255,105,180,0.8) 50%, rgba(255,20,147,0.4) 100%)';
                customCursor.style.boxShadow = '0 0 25px rgba(255,20,147,0.8), inset 0 0 12px rgba(255,105,180,0.6)';
                customCursor.style.border = '2px solid rgba(255,20,147,0.9)';
                customCursor.style.filter = 'brightness(1.1) saturate(1.1)';
            } else if (consciousness.interest > 0.2) {
                // Medium interest - subtle glow
                customCursor.style.transform = 'translate(-50%, -50%) scale(1.1)';
                customCursor.style.background = 'radial-gradient(circle, rgba(255,105,180,0.9) 0%, rgba(255,20,147,0.7) 50%, rgba(255,105,180,0.3) 100%)';
                customCursor.style.boxShadow = '0 0 20px rgba(255,20,147,0.7), inset 0 0 10px rgba(255,105,180,0.5)';
                customCursor.style.border = '2px solid rgba(255,20,147,0.8)';
                customCursor.style.filter = 'brightness(1) saturate(1)';
            } else {
                // Low/no interest - normal state
                customCursor.style.transform = 'translate(-50%, -50%) scale(1)';
                customCursor.style.background = 'radial-gradient(circle, rgba(255,105,180,0.9) 0%, rgba(255,20,147,0.7) 50%, rgba(255,105,180,0.3) 100%)';
                customCursor.style.boxShadow = '0 0 15px rgba(255,20,147,0.6), inset 0 0 10px rgba(255,105,180,0.4)';
                customCursor.style.border = '2px solid rgba(255,20,147,0.8)';
                customCursor.style.filter = 'brightness(1) saturate(1)';
            }
            
            // Add distance-based effects (only when not in contact)
            if (pixelDistance < 50) {
                // Very close to cube - intense interaction
                customCursor.style.width = '25px';
                customCursor.style.height = '25px';
            } else if (pixelDistance < 100) {
                // Close to cube - moderate interaction
                customCursor.style.width = '22px';
                customCursor.style.height = '22px';
            } else {
                // Far from cube - normal state
                customCursor.style.width = '20px';
                customCursor.style.height = '20px';
            }
            
            // Add cube state-based cursor effects
            if (cubeState === 'excited') {
                customCursor.style.animation = 'pulse 0.3s ease-in-out infinite alternate';
            } else if (cubeState === 'happy') {
                customCursor.style.animation = 'pulse 0.6s ease-in-out infinite alternate';
            } else {
                customCursor.style.animation = 'none';
            }
        }
    };
    
    // Add mouse listeners for cursor
    document.addEventListener('mousemove', updateCursorPosition);
    
    // Add touch listeners for mobile support
    document.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const touchEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY
            };
            updateCursorPosition(touchEvent);
            customCursor.style.opacity = '1';
        }
    }, { passive: false });
    
    document.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const touchEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY
            };
            updateCursorPosition(touchEvent);
            customCursor.style.opacity = '1';
        }
    }, { passive: false });
    
    document.addEventListener('touchend', () => {
        customCursor.style.opacity = '0';
    }, { passive: false });
    
    // Hide custom cursor when leaving canvas
    canvas.addEventListener('mouseleave', () => {
        customCursor.style.opacity = '0';
    });
    
    canvas.addEventListener('mouseenter', () => {
        customCursor.style.opacity = '1';
    });
};

// Initialize custom cursor
createCustomCursor();

// Cube contact effect function
const triggerCubeContactEffect = (cubeScreenX = window.innerWidth / 2, cubeScreenY = window.innerHeight / 2) => {
    // Visual burst effect on the whole organism
    cubeGrowthSystem.organismGroup.scale.setScalar(1.3);
    setTimeout(() => {
        cubeGrowthSystem.organismGroup.scale.setScalar(1.0);
    }, 200);
    
    // Change all cube colors temporarily to show happiness
    const originalColors = cubeGrowthSystem.allCubes.map(cubeData => cubeData.mesh.material.color.getHex());
    cubeGrowthSystem.allCubes.forEach(cubeData => {
        cubeData.mesh.material.color.setHex(0xffff00); // Bright yellow when touched
    });
    setTimeout(() => {
        cubeGrowthSystem.allCubes.forEach((cubeData, index) => {
            cubeData.mesh.material.color.setHex(originalColors[index]);
        });
    }, 300);
    
    // Create temporary contact light burst
    const contactLight = new THREE.PointLight(0xffffff, 2, 1);
    contactLight.position.copy(cubeGrowthSystem.organismGroup.position);
    contactLight.position.z += 0.2;
    scene.add(contactLight);
    
    // Animate contact light
    let lightIntensity = 2;
    const fadeLight = () => {
        lightIntensity -= 0.1;
        contactLight.intensity = Math.max(0, lightIntensity);
        if (lightIntensity > 0) {
            requestAnimationFrame(fadeLight);
        } else {
            scene.remove(contactLight);
        }
    };
    fadeLight();
    
    // Flash the emotional light
    const originalEmotionalIntensity = emotionalLight.intensity;
    emotionalLight.intensity = 1.5;
    setTimeout(() => {
        emotionalLight.intensity = originalEmotionalIntensity;
    }, 150);
    
    // Cube emotional response to being touched
    cubeState = 'excited';
    cubePersonality.mood = 1.0;
    consciousness.interest = 1.0;
    
    // Add haptic-like visual feedback
    document.body.style.filter = 'brightness(1.1)';
    setTimeout(() => {
        document.body.style.filter = 'brightness(1.0)';
    }, 100);
};

// DISCO EFFECT SYSTEM - Activates only when cursor is on cube
let discoSystem = {
    isActive: false,
    discoLights: [],
    lastActivation: 0
};

// Click history for tracking interactions
let clickHistory = [];

// Mouse speed tracking for creative triggers
// Disco mode activation when cursor is on cube
function checkCursorOnCube(event) {
    // Get actual cube position in screen coordinates
    const vector = new THREE.Vector3();
    cubeGrowthSystem.organismGroup.getWorldPosition(vector);
    vector.project(camera);
    
    // Convert cube's 3D position to screen coordinates
    const rect = canvas.getBoundingClientRect();
    const cubeScreenX = (vector.x * 0.5 + 0.5) * rect.width + rect.left;
    const cubeScreenY = (vector.y * -0.5 + 0.5) * rect.height + rect.top;
    
    // Calculate actual distance from cursor to cube in screen pixels
    const dx = event.clientX - cubeScreenX;
    const dy = event.clientY - cubeScreenY;
    const pixelDistance = Math.sqrt(dx * dx + dy * dy);
    
    // Contact detection based on cube size (approximately 30-40 pixels)
    const cubeRadius = 35;
    const isOnCube = pixelDistance < cubeRadius;
    
    if (isOnCube && !discoSystem.isActive) {
        activateDiscoMode();
    } else if (!isOnCube && discoSystem.isActive) {
        deactivateDiscoMode();
    }
}

// Activate disco mode
function activateDiscoMode() {
    if (discoSystem.isActive) return; // Already active
    
    discoSystem.isActive = true;
    discoSystem.lastActivation = Date.now();
    
    console.log("DISCO MODE ACTIVATED!");
    
    // Play mode activation sound
    if (window.retroAudio) {
        window.retroAudio.playCubeInteraction();
    }
    
    // Initialize disco lights
    initDiscoMode();
}

// Deactivate disco mode
function deactivateDiscoMode() {
    if (!discoSystem.isActive) return;
    
    discoSystem.isActive = false;
    
    console.log("Disco mode deactivated");
    
    // Clean up disco lights
    discoSystem.discoLights.forEach(light => scene.remove(light));
    discoSystem.discoLights = [];
    
    // Reset cube properties to normal emotional colors
    cubeGrowthSystem.allCubes.forEach(cubeData => {
        cubeData.mesh.material.shininess = 80;
        cubeData.mesh.material.specular.setHex(0x444444);
        cubeData.mesh.material.emissiveIntensity = 0.2;
        
        // Restore normal emotional color instead of keeping disco colors
        const currentEmotionalColor = getEmotionalColor(cubePersonality.mood, cubeState);
        cubeData.mesh.material.color.setHex(currentEmotionalColor);
    });
}

// DISCO MODE - Cube becomes a disco ball!
function initDiscoMode() {
    console.log("DISCO TIME! Cube is now a disco ball!");
    
    // Create disco lights around the cube
    discoSystem.discoLights = [];
    const colors = [0xff0080, 0x00ff80, 0x8000ff, 0xff8000, 0x0080ff];
    
    for (let i = 0; i < 8; i++) {
        const light = new THREE.PointLight(colors[i % colors.length], 1, 2);
        const angle = (i / 8) * Math.PI * 2;
        light.position.set(
            Math.cos(angle) * 1.5,
            Math.sin(angle) * 1.5,
            0.5
        );
        discoSystem.discoLights.push(light);
        scene.add(light);
    }
    
    // Make cube reflective like a disco ball
    cubeGrowthSystem.allCubes.forEach(cubeData => {
        cubeData.mesh.material.shininess = 200;
        cubeData.mesh.material.specular.setHex(0xffffff);
        cubeData.mesh.material.emissiveIntensity = 0.3;
    });
}

// Update disco mode animation
function updateDiscoMode() {
    if (!discoSystem.isActive) return;
    
    const time = Date.now() * 0.001;
    
    // Rotate disco lights
    discoSystem.discoLights.forEach((light, i) => {
        const angle = time * 2 + (i / discoSystem.discoLights.length) * Math.PI * 2;
        light.position.x = Math.cos(angle) * 1.5;
        light.position.y = Math.sin(angle) * 1.5;
        light.intensity = 0.5 + Math.sin(time * 10 + i) * 0.5;
    });
    
    // Make cube spin like a disco ball
    cubeGrowthSystem.organismGroup.rotation.y += 0.1;
    cubeGrowthSystem.organismGroup.rotation.x += 0.05;
    
    // Disco colors - only when disco is active
    const discoColor = Math.floor(time * 5) % 2 === 0 ? 0xff00ff : 0x00ffff;
    cubeGrowthSystem.allCubes.forEach(cubeData => {
        cubeData.mesh.material.color.setHex(discoColor);
    });
}



// Update specific creative modes


// Animation loop with consciousness
function animate() {
    requestAnimationFrame(animate);
    
    // Update animation time
    animationTime = Date.now();
    
    // Update conscious behavior
    updateConsciousBehavior();
    
    // Update cube group movement (keep all cubes together as one body)
    updateCubeGroupMovement();
    
    // Update animation effects
    updateBreathingAnimation();
    updateGlowEffect();
    updateColorTransition();
    updateTrailEffect();
    updateLighting(); // Add lighting updates
    
    // UPDATE DISCO MODE
    updateDiscoMode();
    
    // Track mouse interactions for cube growth
    trackMouseInteractions();
    
    // Calculate smoothing factors based on cube state
    let positionSmoothing = 0.02; // Reduced from 0.05
    let rotationSmoothing = 0.015; // Reduced from 0.03
    
    switch (cubeState) {
        case 'excited':
            positionSmoothing = 0.04; // Reduced from 0.08 for calmer movement
            rotationSmoothing = 0.025; // Reduced from 0.04
            break;
        case 'happy':
            positionSmoothing = 0.07; // Fast response for dog-like following
            rotationSmoothing = 0.05; // Responsive rotation for happy spinning
            break;
        case 'curious':
            positionSmoothing = 0.04; // Reduced from 0.08
            rotationSmoothing = 0.025; // Reduced from 0.05
            break;
        case 'shy':
            positionSmoothing = 0.015; // Reduced from 0.03
            rotationSmoothing = 0.01; // Reduced from 0.02
            break;
        case 'playful':
            positionSmoothing = 0.06; // Reduced from 0.12
            rotationSmoothing = 0.03; // Reduced from 0.06
            break;
        case 'idle':
        default:
            positionSmoothing = 0.02; // Reduced from 0.04
            rotationSmoothing = 0.012; // Reduced from 0.025
            break;
    }
    
    // Physics-based smooth movement with velocity
    const deltaX = targetPosition.x - cubeGrowthSystem.organismGroup.position.x;
    const deltaY = targetPosition.y - cubeGrowthSystem.organismGroup.position.y;
    
    // Add acceleration towards target (reduced acceleration)
    velocity.x += deltaX * positionSmoothing * 0.15; // Reduced from 0.3
    velocity.y += deltaY * positionSmoothing * 0.15; // Reduced from 0.3
    
    // Apply stronger damping to velocity for slower movement
    velocity.x *= 0.92; // Increased damping from 0.85
    velocity.y *= 0.92; // Increased damping from 0.85
    
    // Calculate movement speed for rotation influence
    const movementSpeed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    const movementRotationInfluence = Math.min(movementSpeed * 15, 0.05); // Scale movement to rotation
    
    // Apply velocity to the organism group position (all cubes move together)
    cubeGrowthSystem.organismGroup.position.x += velocity.x;
    cubeGrowthSystem.organismGroup.position.y += velocity.y;
    
    // Safety constraints to prevent cube from going off-screen or clipping with ground plane
    const safetyBounds = {
        minY: -1.5,  // Prevent going too low and clipping with ground plane
        maxY: 1.5,
        minX: -2.0,
        maxX: 2.0
    };
    
    cubeGrowthSystem.organismGroup.position.x = Math.max(safetyBounds.minX, 
        Math.min(safetyBounds.maxX, cubeGrowthSystem.organismGroup.position.x));
    cubeGrowthSystem.organismGroup.position.y = Math.max(safetyBounds.minY, 
        Math.min(safetyBounds.maxY, cubeGrowthSystem.organismGroup.position.y));
    
    // Smooth rotation speed changes with easing
    const rotationDelta = targetRotationSpeed - currentRotationSpeed;
    currentRotationSpeed += rotationDelta * rotationSmoothing;
    
    // Enhanced conscious "looking" behavior - cube maintains eye contact
    if (consciousness.interest > 0.1) {
        // When interested, cube "looks" at cursor with natural, organic movement
        const lookIntensity = Math.min(consciousness.interest * cubePersonality.attention, 1.0);
        const attentionFactor = cubePersonality.attention * 0.3;
        
        // More natural looking angles - like the cube is trying to see you
        const lookX = consciousness.focus.y * attentionFactor * lookIntensity;
        const lookY = consciousness.focus.x * attentionFactor * lookIntensity;
        
        // Add subtle "blinking" or attention shifts
        const time = Date.now() * 0.001;
        const attentionShift = Math.sin(time * 0.5) * 0.05 * consciousness.interest;
        
        // Smooth "eye contact" rotation with natural hesitation
        const rotationEasing = 0.02 + (consciousness.interest * 0.01); // Faster when more interested
        cubeGrowthSystem.organismGroup.rotation.x += (lookX + attentionShift - cubeGrowthSystem.organismGroup.rotation.x) * rotationEasing + currentRotationSpeed + movementRotationInfluence;
        cubeGrowthSystem.organismGroup.rotation.y += (lookY - cubeGrowthSystem.organismGroup.rotation.y) * rotationEasing + currentRotationSpeed + movementRotationInfluence * 0.8;
        
        // Gradual attention decay - cube gets distracted over time
        cubePersonality.attention = Math.max(cubePersonality.attention - 0.0005, 0.1);
    } else {
        // Normal rotation when not focused - slower organic variation + movement-based rotation
        const organicVariation = Math.sin(Date.now() * 0.0003) * 0.001; // Reduced from 0.0005 and 0.002
        
        // Add movement-based rotation - cube rotates based on its velocity
        const velocityRotationX = velocity.y * 2; // Vertical movement affects X rotation
        const velocityRotationY = velocity.x * 2; // Horizontal movement affects Y rotation
        
        cubeGrowthSystem.organismGroup.rotation.x += currentRotationSpeed + organicVariation + velocityRotationX + movementRotationInfluence;
        cubeGrowthSystem.organismGroup.rotation.y += currentRotationSpeed - organicVariation * 0.7 + velocityRotationY + movementRotationInfluence * 0.8;
        cubeGrowthSystem.organismGroup.rotation.z += movementRotationInfluence * 0.5; // Add some Z rotation for more dynamic movement
    }
    
    // Auto-save cube data periodically (every 60 frames ≈ 1 second)
    if (frameCount % 60 === 0 && currentCubeData) {
        // Update position and rotation
        currentCubeData.rotation = {
            x: cubeGrowthSystem.organismGroup.rotation.x,
            y: cubeGrowthSystem.organismGroup.rotation.y,
            z: cubeGrowthSystem.organismGroup.rotation.z
        };
        currentCubeData.position = {
            x: cubeGrowthSystem.organismGroup.position.x,
            y: cubeGrowthSystem.organismGroup.position.y,
            z: cubeGrowthSystem.organismGroup.position.z
        };
        
        // Auto-save growth state including all cube positions
        currentCubeData.growthState = {
            generation: cubeGrowthSystem.cubeGeneration,
            totalCubes: cubeGrowthSystem.allCubes.length,
            cubePositions: cubeGrowthSystem.allCubes.map(cubeData => ({
                position: {
                    x: cubeData.group.position.x,
                    y: cubeData.group.position.y,
                    z: cubeData.group.position.z
                },
                generation: cubeData.generation
            }))
        };
        
        // Auto-save all data to IndexedDB
        cubeDB.updateCube(currentCubeData).catch(console.error);
        
        // Update display
        updateDataDisplay();
    }
    frameCount++;
    
    // Emit emotional particles based on current state
    if (cubeGrowthSystem.organismGroup && cubeGrowthSystem.organismGroup.position) {
        // Convert 3D organism position to screen coordinates for particle emission
        const vector = new THREE.Vector3();
        vector.copy(cubeGrowthSystem.organismGroup.position);
        vector.project(camera);
        
        const cubeScreenX = (vector.x * 0.5 + 0.5) * canvas.clientWidth;
        const cubeScreenY = (vector.y * -0.5 + 0.5) * canvas.clientHeight;
        
        // Emit particles based on emotional state or mood
        let particleState = cubeState;
        
        // Override with mood-based states for sad particles
        if (cubePersonality.mood < 0.3 && cubeState === 'idle') {
            particleState = 'sad';
        }
        
        // Emotional particle effect removed
    }
    
    renderer.render(scene, camera);
}

let frameCount = 0;

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    
    // Keep organism centered
    cubeGrowthSystem.organismGroup.position.set(0, 0, 0);
});

// Auto-save when user navigates away from the page
window.addEventListener('beforeunload', () => {
    if (currentCubeData) {
        // Force immediate save of current state
        saveGrowthState();
    }
});

// Auto-save on page visibility changes (when user switches tabs)
document.addEventListener('visibilitychange', () => {
    if (document.hidden && currentCubeData) {
        // Page is being hidden, save current state
        saveGrowthState();
    }
});

// Auto-save at regular intervals (every 30 seconds)
setInterval(() => {
    if (currentCubeData) {
        saveGrowthState();
    }
}, 30000); // 30 seconds

// Initialize and load cube data, then start animation
initAndLoadCube();

// Start animation
animate();

// Track mouse interactions for cube growth
function trackMouseInteractions() {
    // Check if currently interacting and mouse is close to cube
    if (cubeGrowthSystem.isInteracting && mousePresent) {
        const currentTime = Date.now();
        
        // Calculate distance from cube center for proximity check
        const distanceFromCube = Math.sqrt(mouse.x * mouse.x + mouse.y * mouse.y);
        
        // Only allow growth if mouse is close to the cube (within interaction range)
        const interactionRange = 0.4; // Adjust this value to control interaction distance
        
        if (distanceFromCube <= interactionRange) {
            const interactionDuration = currentTime - cubeGrowthSystem.interactionStartTime;
            
            // Play hover sound when first entering interaction zone
            if (interactionDuration > 100 && interactionDuration < 200 && window.retroAudio) {
                window.retroAudio.playHover();
            }
            
            // Play interaction sound during active interaction
            if (interactionDuration > 500 && interactionDuration % 1000 < 16 && window.retroAudio) {
                window.retroAudio.playCubeInteraction();
            }
            
            // Debug logging - more frequent
            if (interactionDuration > 500 && interactionDuration % 200 < 16) { // Log every 200ms
                console.log(`Interaction: ${Math.floor(interactionDuration/100)/10}s / ${cubeGrowthSystem.growthThreshold/1000}s - Distance: ${distanceFromCube.toFixed(2)} - HasGrown: ${cubeGrowthSystem.hasGrown}`);
            }
            
            // Check if interaction duration exceeds threshold and hasn't grown yet
            if (interactionDuration > cubeGrowthSystem.growthThreshold && !cubeGrowthSystem.hasGrown) {
                // Trigger cube growth (cell division)
                triggerCubeGrowth();
            }
        } else {
            // Mouse moved away from cube, stop growth process
            cubeGrowthSystem.isInteracting = false;
            cubeGrowthSystem.interactionStartTime = 0;
            cubeGrowthSystem.hasGrown = false;
        }
    }
}

// Event listener for mouse down (start interaction)
canvas.addEventListener('mousedown', () => {
    cubeGrowthSystem.isInteracting = true;
    cubeGrowthSystem.interactionStartTime = Date.now();
    cubeGrowthSystem.hasGrown = false; // Reset growth flag when starting new interaction
    
    // TRACK CLICKS FOR SILLY MODE
    clickHistory.push(Date.now());
    
    // Play interaction start sound
    if (window.retroAudio) {
        window.retroAudio.playCubeInteraction();
    }
});

// Event listener for mouse up (end interaction)
canvas.addEventListener('mouseup', () => {
    cubeGrowthSystem.isInteracting = false;
    
    // Auto-save growth state when interaction ends (regardless of growth)
    if (currentCubeData) {
        saveGrowthState();
        updateDataDisplay();
    }
});
