import React, { useState, useEffect } from 'react';
import { Play, Info, ChevronRight, Grid3x3, Shuffle } from 'lucide-react';

const LayoutGenerator = () => {
  const [layouts, setLayouts] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState(0);
  const [animatingBuildings, setAnimatingBuildings] = useState([]);
  const [showInfo, setShowInfo] = useState(false);
  const [alignmentMode, setAlignmentMode] = useState('random'); // 'random' or 'aligned'
  const [numBuildings, setNumBuildings] = useState(12);

  // Site and building parameters
  const SITE_WIDTH = 200;
  const SITE_HEIGHT = 140;
  const PLAZA_SIZE = 40;
  const PLAZA_X = (SITE_WIDTH - PLAZA_SIZE) / 2;
  const PLAZA_Y = (SITE_HEIGHT - PLAZA_SIZE) / 2;
  const MIN_DISTANCE = 15;
  const BOUNDARY_DISTANCE = 10;
  const NEIGHBOR_DISTANCE = 60;

  const TOWER_A = { width: 30, height: 20, type: 'A', color: '#2563eb' };
  const TOWER_B = { width: 20, height: 20, type: 'B', color: '#059669' };

  // Calculate max buildings based on constraints
  const calculateMaxBuildings = () => {
    // Conservative estimate considering all constraints
    const usableWidth = SITE_WIDTH - 2 * BOUNDARY_DISTANCE;
    const usableHeight = SITE_HEIGHT - 2 * BOUNDARY_DISTANCE;
    const usableArea = usableWidth * usableHeight - (PLAZA_SIZE * PLAZA_SIZE);
    
    // Average building size with spacing
    const avgBuildingArea = ((TOWER_A.width + MIN_DISTANCE) * (TOWER_A.height + MIN_DISTANCE) + 
                             (TOWER_B.width + MIN_DISTANCE) * (TOWER_B.height + MIN_DISTANCE)) / 2;
    
    return Math.floor(usableArea / avgBuildingArea * 0.6); // 0.6 factor for safety
  };

  const MAX_BUILDINGS = calculateMaxBuildings();

  const checkDistance = (b1, b2, minDist) => {
    const xDist = Math.max(0, Math.max(b1.x - (b2.x + b2.width), b2.x - (b1.x + b1.width)));
    const yDist = Math.max(0, Math.max(b1.y - (b2.y + b2.height), b2.y - (b1.y + b1.height)));
    const dist = Math.sqrt(xDist * xDist + yDist * yDist);
    return dist;
  };

  const overlapsPlaza = (building) => {
    return !(building.x + building.width <= PLAZA_X ||
             building.x >= PLAZA_X + PLAZA_SIZE ||
             building.y + building.height <= PLAZA_Y ||
             building.y >= PLAZA_Y + PLAZA_SIZE);
  };

  const withinBoundaries = (building) => {
    return building.x >= BOUNDARY_DISTANCE &&
           building.y >= BOUNDARY_DISTANCE &&
           building.x + building.width <= SITE_WIDTH - BOUNDARY_DISTANCE &&
           building.y + building.height <= SITE_HEIGHT - BOUNDARY_DISTANCE;
  };

  const validateLayout = (buildings) => {
    const violations = [];
    
    for (let i = 0; i < buildings.length; i++) {
      const b1 = buildings[i];
      
      if (!withinBoundaries(b1)) {
        violations.push({ type: 'boundary', building: i });
      }
      
      if (overlapsPlaza(b1)) {
        violations.push({ type: 'plaza', building: i });
      }
      
      for (let j = i + 1; j < buildings.length; j++) {
        const b2 = buildings[j];
        const dist = checkDistance(b1, b2, 0);
        if (dist < MIN_DISTANCE) {
          violations.push({ type: 'spacing', buildings: [i, j], distance: dist.toFixed(1) });
        }
      }
      
      if (b1.type === 'A') {
        let hasNearbyB = false;
        for (let j = 0; j < buildings.length; j++) {
          if (i !== j && buildings[j].type === 'B') {
            const dist = checkDistance(b1, buildings[j], 0);
            if (dist <= NEIGHBOR_DISTANCE) {
              hasNearbyB = true;
              break;
            }
          }
        }
        if (!hasNearbyB) {
          violations.push({ type: 'neighbor', building: i });
        }
      }
    }
    
    return violations;
  };

  // Generate aligned layout where buildings in same column share X coordinate
  const generateAlignedLayout = (targetCount) => {
    const buildings = [];
    const numA = Math.ceil(targetCount * 0.4); // ~40% Tower A
    const numB = targetCount - numA;
    
    // Define vertical columns (X positions)
    const minX = BOUNDARY_DISTANCE;
    const maxX = SITE_WIDTH - BOUNDARY_DISTANCE - Math.max(TOWER_A.width, TOWER_B.width);
    
    // Calculate how many columns we can fit
    const avgBuildingWidth = (TOWER_A.width + TOWER_B.width) / 2;
    const numColumns = Math.floor((maxX - minX) / (avgBuildingWidth + MIN_DISTANCE)) + 1;
    const columnSpacing = (maxX - minX) / Math.max(1, numColumns - 1);
    
    // Create column X positions, avoiding plaza
    const columnXPositions = [];
    for (let i = 0; i < numColumns; i++) {
      const x = minX + i * columnSpacing;
      // Skip columns that would intersect plaza
      const wouldIntersectPlaza = (x < PLAZA_X + PLAZA_SIZE && x + TOWER_A.width > PLAZA_X);
      if (!wouldIntersectPlaza) {
        columnXPositions.push(x);
      }
    }
    
    if (columnXPositions.length === 0) return buildings;
    
    // Create building sequence
    const sequence = [];
    for (let i = 0; i < numA; i++) sequence.push('A');
    for (let i = 0; i < numB; i++) sequence.push('B');
    sequence.sort(() => Math.random() - 0.5);
    
    // Place buildings in columns
    let currentColumn = 0;
    const columnBuildings = columnXPositions.map(() => []);
    
    for (const type of sequence) {
      const template = type === 'A' ? TOWER_A : TOWER_B;
      let placed = false;
      let attempts = 0;
      
      while (!placed && attempts < columnXPositions.length * 2) {
        const colIndex = currentColumn % columnXPositions.length;
        const x = columnXPositions[colIndex];
        
        // Find valid Y position in this column
        const minY = BOUNDARY_DISTANCE;
        const maxY = SITE_HEIGHT - BOUNDARY_DISTANCE - template.height;
        
        // Try to place at different Y positions
        for (let yAttempt = 0; yAttempt < 20; yAttempt++) {
          const y = minY + Math.random() * (maxY - minY);
          
          const building = {
            x: x,
            y: y,
            width: template.width,
            height: template.height,
            type: type,
            color: template.color
          };
          
          if (overlapsPlaza(building) || !withinBoundaries(building)) continue;
          
          let valid = true;
          for (const existing of buildings) {
            if (checkDistance(building, existing, 0) < MIN_DISTANCE) {
              valid = false;
              break;
            }
          }
          
          if (valid) {
            buildings.push(building);
            columnBuildings[colIndex].push(building);
            placed = true;
            break;
          }
        }
        
        currentColumn++;
        attempts++;
      }
      
      if (!placed) break;
    }
    
    return buildings;
  };

  // Generate random layout
  const generateRandomLayout = (targetCount) => {
    const buildings = [];
    const numA = Math.ceil(targetCount * 0.4);
    const numB = targetCount - numA;
    
    const sequence = [];
    for (let i = 0; i < numA; i++) sequence.push('A');
    for (let i = 0; i < numB; i++) sequence.push('B');
    sequence.sort(() => Math.random() - 0.5);
    
    for (const type of sequence) {
      const template = type === 'A' ? TOWER_A : TOWER_B;
      let placed = false;
      
      for (let attempt = 0; attempt < 100; attempt++) {
        const building = {
          x: Math.random() * (SITE_WIDTH - template.width - 2 * BOUNDARY_DISTANCE) + BOUNDARY_DISTANCE,
          y: Math.random() * (SITE_HEIGHT - template.height - 2 * BOUNDARY_DISTANCE) + BOUNDARY_DISTANCE,
          width: template.width,
          height: template.height,
          type: type,
          color: template.color
        };
        
        if (overlapsPlaza(building) || !withinBoundaries(building)) continue;
        
        let valid = true;
        for (const existing of buildings) {
          if (checkDistance(building, existing, 0) < MIN_DISTANCE) {
            valid = false;
            break;
          }
        }
        
        if (valid) {
          buildings.push(building);
          placed = true;
          break;
        }
      }
      
      if (!placed) break;
    }
    
    return buildings;
  };

  const scoreLayout = (buildings, violations) => {
    const countA = buildings.filter(b => b.type === 'A').length;
    const countB = buildings.filter(b => b.type === 'B').length;
    const totalArea = countA * (TOWER_A.width * TOWER_A.height) + 
                     countB * (TOWER_B.width * TOWER_B.height);
    
    let score = totalArea * 100;
    score -= violations.length * 10000;
    score += buildings.length * 500; // Bonus for more buildings
    
    return score;
  };

  const generateLayouts = () => {
    setIsGenerating(true);
    setAnimatingBuildings([]);
    
    setTimeout(() => {
      const results = [];
      const numLayoutsToGenerate = 6;
      const attemptsPerLayout = 3;
      
      for (let i = 0; i < numLayoutsToGenerate * attemptsPerLayout; i++) {
        const buildings = alignmentMode === 'aligned' 
          ? generateAlignedLayout(numBuildings)
          : generateRandomLayout(numBuildings);
        
        const violations = validateLayout(buildings);
        const score = scoreLayout(buildings, violations);
        
        results.push({
          id: i,
          buildings,
          violations,
          score
        });
      }
      
      results.sort((a, b) => b.score - a.score);
      const topLayouts = results.slice(0, numLayoutsToGenerate);
      
      topLayouts.forEach((layout, idx) => {
        const countA = layout.buildings.filter(b => b.type === 'A').length;
        const countB = layout.buildings.filter(b => b.type === 'B').length;
        const totalArea = countA * (TOWER_A.width * TOWER_A.height) + 
                         countB * (TOWER_B.width * TOWER_B.height);
        
        layout.stats = {
          towerA: countA,
          towerB: countB,
          totalBuildings: countA + countB,
          totalArea: totalArea,
          isValid: layout.violations.length === 0
        };
        layout.displayId = idx + 1;
      });
      
      setLayouts(topLayouts);
      setSelectedLayout(0);
      setIsGenerating(false);
      
      if (topLayouts.length > 0) {
        animateBricks(topLayouts[0].buildings);
      }
    }, 100);
  };

  const animateBricks = (buildings) => {
    setAnimatingBuildings([]);
    buildings.forEach((_, idx) => {
      setTimeout(() => {
        setAnimatingBuildings(prev => [...prev, idx]);
      }, idx * 80);
    });
  };

  const handleLayoutSelect = (idx) => {
    setSelectedLayout(idx);
    animateBricks(layouts[idx].buildings);
  };

  useEffect(() => {
    generateLayouts();
  }, []);

  const renderThumbnail = (layout, scale = 0.8) => {
    return (
      <svg 
        width={SITE_WIDTH * scale} 
        height={SITE_HEIGHT * scale}
        className="rounded"
      >
        <rect 
          x={0} 
          y={0} 
          width={SITE_WIDTH * scale} 
          height={SITE_HEIGHT * scale}
          fill="#f9fafb"
        />
        
        <rect 
          x={PLAZA_X * scale} 
          y={PLAZA_Y * scale}
          width={PLAZA_SIZE * scale}
          height={PLAZA_SIZE * scale}
          fill="#fef3c7"
          opacity="0.6"
        />
        
        {layout.buildings.map((building, idx) => {
          const hasViolation = layout.violations.some(v => 
            v.building === idx || (v.buildings && v.buildings.includes(idx))
          );
          
          return (
            <rect 
              key={idx}
              x={building.x * scale} 
              y={building.y * scale}
              width={building.width * scale}
              height={building.height * scale}
              fill={building.color}
              stroke={hasViolation ? "#ef4444" : "none"}
              strokeWidth="2"
              opacity="0.9"
            />
          );
        })}
      </svg>
    );
  };

  const renderLayout = (layout, scale = 2.8) => {
    if (!layout) return null;
    
    return (
      <svg 
        width={SITE_WIDTH * scale} 
        height={SITE_HEIGHT * scale}
        className="rounded-lg"
        style={{ background: '#fafafa' }}
      >
        <rect 
          x={0} 
          y={0} 
          width={SITE_WIDTH * scale} 
          height={SITE_HEIGHT * scale}
          fill="#fafafa"
        />
        
        <rect 
          x={BOUNDARY_DISTANCE * scale} 
          y={BOUNDARY_DISTANCE * scale}
          width={(SITE_WIDTH - 2 * BOUNDARY_DISTANCE) * scale}
          height={(SITE_HEIGHT - 2 * BOUNDARY_DISTANCE) * scale}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="1"
          strokeDasharray="8,4"
        />
        
        <rect 
          x={PLAZA_X * scale} 
          y={PLAZA_Y * scale}
          width={PLAZA_SIZE * scale}
          height={PLAZA_SIZE * scale}
          fill="#fffbeb"
          stroke="#fbbf24"
          strokeWidth="1.5"
        />
        <text 
          x={(PLAZA_X + PLAZA_SIZE/2) * scale} 
          y={(PLAZA_Y + PLAZA_SIZE/2) * scale}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: '11px', fontWeight: '600', fill: '#b45309' }}
        >
          PLAZA
        </text>
        
        {layout.buildings.map((building, idx) => {
          const hasViolation = layout.violations.some(v => 
            v.building === idx || (v.buildings && v.buildings.includes(idx))
          );
          
          const isAnimated = animatingBuildings.includes(idx);
          
          return (
            <g key={idx} style={{
              opacity: isAnimated ? 1 : 0,
              transform: isAnimated ? 'translateY(0)' : 'translateY(-20px)',
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
              <rect 
                x={building.x * scale} 
                y={building.y * scale}
                width={building.width * scale}
                height={building.height * scale}
                fill={building.color}
                stroke={hasViolation ? "#ef4444" : "#ffffff"}
                strokeWidth={hasViolation ? "3" : "2"}
                rx="2"
              />
              <text 
                x={(building.x + building.width/2) * scale} 
                y={(building.y + building.height/2) * scale}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fontSize: '13px', fontWeight: '700', fill: 'white' }}
              >
                {building.type}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  const currentLayout = layouts[selectedLayout];

  return (
    <div className="w-full min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                Layout Generator
              </h1>
              <p className="text-sm text-gray-500">
                Site: 200m × 140m · Plaza: 40m × 40m
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2 transition-colors"
              >
                <Info className="w-4 h-4" />
                Info
              </button>
              
              <button
                onClick={generateLayouts}
                disabled={isGenerating}
                className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:bg-gray-400 flex items-center gap-2 transition-colors"
              >
                <Play className="w-4 h-4" />
                {isGenerating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info Panel */}
      {showInfo && (
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-900 mb-1">Boundary</div>
                <div className="text-gray-600">10m from edge</div>
              </div>
              <div>
                <div className="font-medium text-gray-900 mb-1">Spacing</div>
                <div className="text-gray-600">15m between buildings</div>
              </div>
              <div>
                <div className="font-medium text-gray-900 mb-1">Tower A</div>
                <div className="text-gray-600">30m × 20m</div>
              </div>
              <div>
                <div className="font-medium text-gray-900 mb-1">Tower B</div>
                <div className="text-gray-600">20m × 20m</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls Panel */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center gap-6">
            {/* Alignment Mode */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">
                Layout Mode:
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setAlignmentMode('random')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors ${
                    alignmentMode === 'random'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Shuffle className="w-4 h-4" />
                  Random
                </button>
                <button
                  onClick={() => setAlignmentMode('aligned')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors ${
                    alignmentMode === 'aligned'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                  Column Aligned
                </button>
              </div>
            </div>

            {/* Building Count */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">
                Target Buildings:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="6"
                  max={MAX_BUILDINGS}
                  value={numBuildings}
                  onChange={(e) => setNumBuildings(parseInt(e.target.value))}
                  className="w-32"
                />
                <span className="text-sm font-medium text-gray-900 w-8">
                  {numBuildings}
                </span>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              Max: {MAX_BUILDINGS} buildings
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-3">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
              Generated Layouts
            </div>
            
            {layouts.map((layout, idx) => (
              <div
                key={layout.id}
                onClick={() => handleLayoutSelect(idx)}
                className={`cursor-pointer rounded-lg border transition-all ${
                  selectedLayout === idx
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="p-4 flex gap-4">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0">
                    {renderThumbnail(layout)}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="font-medium text-gray-900">
                        Layout {layout.displayId}
                      </div>
                      <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                        layout.stats.isValid
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {layout.stats.isValid ? 'Valid' : 'Invalid'}
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Tower A</span>
                        <span className="font-medium text-gray-900">{layout.stats.towerA}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tower B</span>
                        <span className="font-medium text-gray-900">{layout.stats.towerB}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-200">
                        <span>Total Area</span>
                        <span className="font-medium text-gray-900">{layout.stats.totalArea} m²</span>
                      </div>
                    </div>
                  </div>
                  
                  {selectedLayout === idx && (
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Main Visualization */}
          <div className="lg:col-span-8">
            {currentLayout && (
              <div className="space-y-6">
                {/* Visualization */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">
                        Layout {currentLayout.displayId}
                      </h2>
                      {alignmentMode === 'aligned' && (
                        <p className="text-sm text-gray-500 mt-1">
                          Buildings aligned in vertical columns
                        </p>
                      )}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      currentLayout.stats.isValid
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {currentLayout.stats.isValid ? '✓ All Rules Satisfied' : `${currentLayout.violations.length} Violation(s)`}
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    {renderLayout(currentLayout)}
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="text-3xl font-semibold text-blue-600 mb-1">
                      {currentLayout.stats.towerA}
                    </div>
                    <div className="text-sm text-gray-600">Tower A</div>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="text-3xl font-semibold text-green-600 mb-1">
                      {currentLayout.stats.towerB}
                    </div>
                    <div className="text-sm text-gray-600">Tower B</div>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="text-3xl font-semibold text-gray-900 mb-1">
                      {currentLayout.stats.totalBuildings}
                    </div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="text-3xl font-semibold text-gray-900 mb-1">
                      {currentLayout.stats.totalArea}
                    </div>
                    <div className="text-sm text-gray-600">m² Area</div>
                  </div>
                </div>

                {/* Violations */}
                {currentLayout.violations.length > 0 && (
                  <div className="bg-red-50 rounded-lg border border-red-200 p-4">
                    <div className="font-medium text-red-900 mb-3">Rule Violations</div>
                    <div className="space-y-2">
                      {currentLayout.violations.map((v, idx) => (
                        <div key={idx} className="text-sm text-red-700 flex items-start gap-2">
                          <span className="flex-shrink-0">•</span>
                          <span>
                            {v.type === 'boundary' && `Building ${v.building} violates boundary clearance (10m required)`}
                            {v.type === 'plaza' && `Building ${v.building} overlaps central plaza`}
                            {v.type === 'spacing' && `Buildings ${v.buildings[0]} and ${v.buildings[1]} are ${v.distance}m apart (15m required)`}
                            {v.type === 'neighbor' && `Tower A ${v.building} has no Tower B within 60m radius`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LayoutGenerator;