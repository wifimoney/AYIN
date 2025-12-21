import * as postcss from 'postcss';

/**
 * PostCSS plugin to prepend @tailwind directives to OnchainKit CSS
 * This ensures Tailwind processes @layer directives correctly
 */
export default function prependTailwindPlugin() {
  return {
    postcssPlugin: 'prepend-tailwind',
    Once(root) {
      // Check if this is OnchainKit's CSS file
      if (root.source && root.source.input && root.source.input.from) {
        const filePath = root.source.input.from;
        if (filePath.includes('@coinbase/onchainkit')) {
          // Prepend @tailwind directives if @layer base is present
          const hasLayerBase = root.nodes.some(
            (node) => node.type === 'atrule' && node.name === 'layer' && node.params === 'base'
          );
          
          if (hasLayerBase) {
            // Check if @tailwind base already exists
            const hasTailwindBase = root.nodes.some(
              (node) => node.type === 'atrule' && node.name === 'tailwind' && node.params === 'base'
            );
            
            if (!hasTailwindBase) {
              // Prepend @tailwind directives
              const tailwindBase = postcss.atRule({ name: 'tailwind', params: 'base' });
              const tailwindComponents = postcss.atRule({ name: 'tailwind', params: 'components' });
              const tailwindUtilities = postcss.atRule({ name: 'tailwind', params: 'utilities' });
              
              root.prepend(tailwindBase, tailwindComponents, tailwindUtilities);
            }
          }
        }
      }
    },
  };
}

prependTailwindPlugin.postcss = true;

