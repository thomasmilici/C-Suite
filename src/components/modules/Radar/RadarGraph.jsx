import React, { useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

export const RadarGraph = ({ data }) => {
    const containerRef = useRef();
    const [dimensions, setDimensions] = useState({ width: 400, height: 300 });

    useEffect(() => {
        if (containerRef.current) {
            setDimensions({
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight
            });
        }

        // Resize observer could he added here
    }, []);

    return (
        <div className="h-full w-full bg-black rounded-xl overflow-hidden border border-zinc-800 relative flex flex-col" ref={containerRef}>
            <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <h2 className="text-gray-400 text-xs uppercase tracking-wider font-mono">Signals Radar</h2>
            </div>
            <div className="flex-grow">
                <ForceGraph2D
                    width={dimensions.width}
                    height={dimensions.height}
                    graphData={data}
                    nodeLabel="id"
                    nodeAutoColorBy="group"
                    backgroundColor="#000000"
                    linkColor={() => "#333333"}
                    nodeRelSize={6}
                    linkWidth={1}
                    nodeCanvasObject={(node, ctx, globalScale) => {
                        const label = node.id;
                        const fontSize = 12 / globalScale;
                        ctx.font = `${fontSize}px Sans-Serif`;
                        const textWidth = ctx.measureText(label).width;
                        const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

                        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                        ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);

                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = node.color || '#E0E0E0';
                        ctx.fillText(label, node.x, node.y);

                        node.__bckgDimensions = bckgDimensions;
                    }}
                    nodePointerAreaPaint={(node, color, ctx) => {
                        ctx.fillStyle = color;
                        const bckgDimensions = node.__bckgDimensions;
                        bckgDimensions && ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);
                    }}
                />
            </div>
        </div>
    );
};
