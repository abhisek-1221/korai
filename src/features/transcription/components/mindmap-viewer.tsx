'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Download, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { toast } from 'sonner';

interface MindmapNode {
  id: string;
  label: string;
  description?: string;
  category: 'main' | 'topic' | 'subtopic' | 'detail';
}

interface MindmapEdge {
  source: string;
  target: string;
}

interface MindmapData {
  title: string;
  nodes: MindmapNode[];
  edges: MindmapEdge[];
}

interface MindmapViewerProps {
  transcriptionId: string;
}

// Custom node styles based on category
const getNodeStyle = (category: string) => {
  switch (category) {
    case 'main':
      return {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#000000',
        border: '2px solid #764ba2',
        borderRadius: '12px',
        padding: '20px 30px',
        fontSize: '18px',
        fontWeight: 'bold',
        minWidth: '200px'
      };
    case 'topic':
      return {
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        color: '#000000',
        border: '2px solid #f5576c',
        borderRadius: '10px',
        padding: '15px 20px',
        fontSize: '16px',
        fontWeight: '600',
        minWidth: '160px'
      };
    case 'subtopic':
      return {
        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        color: '#000000',
        border: '2px solid #00f2fe',
        borderRadius: '8px',
        padding: '12px 16px',
        fontSize: '14px',
        fontWeight: '500',
        minWidth: '140px'
      };
    case 'detail':
      return {
        background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        color: '#000000',
        border: '2px solid #38f9d7',
        borderRadius: '6px',
        padding: '10px 14px',
        fontSize: '13px',
        minWidth: '120px'
      };
    default:
      return {
        background: '#ffffff',
        color: '#000000',
        border: '1px solid #ddd',
        borderRadius: '6px',
        padding: '10px',
        fontSize: '14px'
      };
  }
};

// Convert mindmap data to React Flow nodes and edges
const convertToFlowElements = (
  mindmapData: MindmapData
): { nodes: Node[]; edges: Edge[] } => {
  // Create a map to track node levels for positioning
  const nodesByLevel: { [key: number]: MindmapNode[] } = {};
  const nodeParents: { [key: string]: string } = {};

  // Build parent relationships
  mindmapData.edges.forEach((edge) => {
    nodeParents[edge.target] = edge.source;
  });

  // Calculate levels
  const getNodeLevel = (
    nodeId: string,
    visited = new Set<string>()
  ): number => {
    if (visited.has(nodeId)) return 0; // Prevent infinite loops
    visited.add(nodeId);

    const parent = nodeParents[nodeId];
    if (!parent) return 0; // Root node
    return 1 + getNodeLevel(parent, visited);
  };

  // Group nodes by level
  mindmapData.nodes.forEach((node) => {
    const level = getNodeLevel(node.id);
    if (!nodesByLevel[level]) {
      nodesByLevel[level] = [];
    }
    nodesByLevel[level].push(node);
  });

  // Create React Flow nodes with positioning
  const nodes: Node[] = [];
  const levelSpacing = 300;
  const nodeSpacing = 180;

  Object.keys(nodesByLevel).forEach((levelStr) => {
    const level = parseInt(levelStr);
    const nodesInLevel = nodesByLevel[level];
    const yOffset = level * levelSpacing;

    nodesInLevel.forEach((node, index) => {
      const xOffset =
        (index - (nodesInLevel.length - 1) / 2) * nodeSpacing +
        (level > 0 ? (index % 2 ? 50 : -50) : 0);

      nodes.push({
        id: node.id,
        type: 'default',
        data: {
          label: (
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontWeight: node.category === 'main' ? 'bold' : 'normal'
                }}
              >
                {node.label}
              </div>
              {node.description && (
                <div
                  style={{ fontSize: '11px', marginTop: '4px', opacity: 0.9 }}
                >
                  {node.description}
                </div>
              )}
            </div>
          )
        },
        position: { x: xOffset, y: yOffset },
        style: getNodeStyle(node.category)
      });
    });
  });

  // Create React Flow edges
  const edges: Edge[] = mindmapData.edges.map((edge, index) => ({
    id: `e-${edge.source}-${edge.target}-${index}`,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#888', strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#888'
    }
  }));

  return { nodes, edges };
};

export default function MindmapViewer({ transcriptionId }: MindmapViewerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<
    'not_started' | 'processing' | 'completed' | 'failed'
  >('not_started');
  const [mindmapData, setMindmapData] = useState<MindmapData | null>(null);

  // Poll for mindmap status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(
          `/api/transcription/${transcriptionId}/mindmap`
        );
        if (response.ok) {
          const data = await response.json();
          setStatus(data.status);

          if (data.status === 'completed' && data.mindmap) {
            setMindmapData(data.mindmap);
            const { nodes: flowNodes, edges: flowEdges } =
              convertToFlowElements(data.mindmap);
            setNodes(flowNodes);
            setEdges(flowEdges);
            setIsLoading(false);
          } else if (data.status === 'failed') {
            setIsLoading(false);
            toast.error('Mindmap generation failed');
          }
        }
      } catch (error) {
        console.error('Error checking mindmap status:', error);
      }
    };

    // Check immediately
    checkStatus();

    // Poll every 2 seconds if processing
    const interval = setInterval(() => {
      if (status === 'processing' || isLoading) {
        checkStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [transcriptionId, status, isLoading]);

  const handleGenerateMindmap = async () => {
    setIsLoading(true);
    setStatus('processing');
    try {
      const response = await fetch(
        `/api/transcription/${transcriptionId}/mindmap`,
        {
          method: 'POST'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate mindmap');
      }

      toast.success('Mindmap generation started!');
    } catch (error) {
      console.error('Error generating mindmap:', error);
      toast.error('Failed to start mindmap generation');
      setIsLoading(false);
      setStatus('failed');
    }
  };

  const handleDownload = useCallback(() => {
    if (!mindmapData) return;

    const dataStr = JSON.stringify(mindmapData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mindmap-${transcriptionId}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Mindmap downloaded!');
  }, [mindmapData, transcriptionId]);

  if (!mindmapData || status === 'processing') {
    return (
      <Card className='border-zinc-800 bg-transparent p-6'>
        <div className='flex flex-col items-center justify-center space-y-4'>
          <h3 className='text-xl font-semibold'>
            {status === 'processing'
              ? 'Generating Mindmap'
              : 'Generate Mindmap'}
          </h3>
          <p className='text-muted-foreground text-center text-sm'>
            {status === 'processing'
              ? 'Please wait while AI analyzes your transcription and creates the mindmap...'
              : 'Create a visual mindmap of this transcription to see key concepts and relationships'}
          </p>
          {status === 'processing' ? (
            <div className='flex flex-col items-center space-y-3'>
              <Loader2 className='h-12 w-12 animate-spin text-blue-500' />
              <p className='text-muted-foreground text-sm'>Processing...</p>
            </div>
          ) : (
            <Button
              onClick={handleGenerateMindmap}
              disabled={isLoading}
              size='lg'
              className='mt-4'
            >
              {isLoading ? (
                <>
                  <Loader2 className='mr-2 h-5 w-5 animate-spin' />
                  Starting...
                </>
              ) : (
                'Create Mindmap'
              )}
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className='border-zinc-800 bg-transparent'>
      <div className='h-[800px] w-full'>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          fitViewOptions={{
            padding: 0.2,
            includeHiddenNodes: false
          }}
          minZoom={0.1}
          maxZoom={2}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={16}
            size={1}
            color='#333'
          />
          <Controls />
          <Panel position='top-right' className='space-x-2'>
            <Button
              onClick={handleDownload}
              variant='outline'
              size='sm'
              className='bg-black/50 backdrop-blur-sm'
            >
              <Download className='mr-2 h-4 w-4' />
              Download
            </Button>
            <Button
              onClick={handleGenerateMindmap}
              disabled={isLoading}
              variant='outline'
              size='sm'
              className='bg-black/50 backdrop-blur-sm'
            >
              {isLoading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Regenerating...
                </>
              ) : (
                'Regenerate'
              )}
            </Button>
          </Panel>
        </ReactFlow>
      </div>
    </Card>
  );
}
