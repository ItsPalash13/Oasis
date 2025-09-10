import React from 'react';
import { InlineMath } from 'react-katex';

/**
 * Renders text with LaTeX and HTML formatting support
 * @param {string} text - The text to render with LaTeX and HTML formatting
 * @returns {JSX.Element[]} Array of React elements
 */
export const renderTextWithLatex = (text) => {
  if (!text) return null;

  // Split text by <tx> tags first
  const latexParts = text.split(/(<tx>.*?<\/tx>)/g);
  
  return latexParts.map((latexPart, latexIndex) => {
    // Check if this part is a LaTeX expression
    if (latexPart.startsWith('<tx>') && latexPart.endsWith('</tx>')) {
      const latexContent = latexPart.slice(4, -5); // Remove <tx> and </tx>
      try {
        return (
          <InlineMath key={`latex-${latexIndex}`} math={latexContent} />
        );
      } catch (error) {
        // If LaTeX parsing fails, show the original text
        return (
          <span key={`latex-error-${latexIndex}`} style={{ color: 'red', fontStyle: 'italic' }}>
            [LaTeX Error: {latexPart}]
          </span>
        );
      }
    }
    
    // For non-LaTeX parts, process nested HTML formatting tags recursively
    const parseNestedHtml = (textPart, keyPrefix = '') => {
      if (!textPart) return null;
      
      // Find the first opening tag
      const tagRegex = /<([biu])>/;
      const match = textPart.match(tagRegex);
      
      if (!match) {
        // No more tags, handle as regular text with line breaks
        return (
          <span key={`text-${keyPrefix}`}>
            {textPart.split('\n').map((line, lineIndex) => (
              <React.Fragment key={lineIndex}>
                {line}
                {lineIndex < textPart.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
          </span>
        );
      }
      
      const tagType = match[1];
      const tagStart = match.index;
      const openTag = `<${tagType}>`;
      const closeTag = `</${tagType}>`;
      
      // Find the matching closing tag
      let depth = 0;
      let closeIndex = -1;
      
      for (let i = tagStart + openTag.length; i < textPart.length; i++) {
        if (textPart.substring(i, i + openTag.length) === openTag) {
          depth++;
        } else if (textPart.substring(i, i + closeTag.length) === closeTag) {
          if (depth === 0) {
            closeIndex = i;
            break;
          }
          depth--;
        }
      }
      
      if (closeIndex === -1) {
        // No matching closing tag, treat as regular text
        return (
          <span key={`text-${keyPrefix}`}>
            {textPart.split('\n').map((line, lineIndex) => (
              <React.Fragment key={lineIndex}>
                {line}
                {lineIndex < textPart.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
          </span>
        );
      }
      
      // Extract content between tags
      const content = textPart.substring(tagStart + openTag.length, closeIndex);
      const afterContent = textPart.substring(closeIndex + closeTag.length);
      
      // Parse the content recursively
      const parsedContent = parseNestedHtml(content, `${keyPrefix}-${tagType}-${tagStart}`);
      
      // Parse the remaining text after the closing tag
      const parsedAfter = parseNestedHtml(afterContent, `${keyPrefix}-after-${closeIndex}`);
      
      // Wrap content in appropriate tag
      let WrapperComponent;
      switch (tagType) {
        case 'b':
          WrapperComponent = 'strong';
          break;
        case 'i':
          WrapperComponent = 'em';
          break;
        case 'u':
          WrapperComponent = 'u';
          break;
        default:
          WrapperComponent = 'span';
      }
      
      return (
        <React.Fragment key={`fragment-${keyPrefix}`}>
          {tagStart > 0 && parseNestedHtml(textPart.substring(0, tagStart), `${keyPrefix}-before-${tagStart}`)}
          <WrapperComponent key={`${tagType}-${keyPrefix}-${tagStart}`}>
            {parsedContent}
          </WrapperComponent>
          {parsedAfter}
        </React.Fragment>
      );
    };
    
    return parseNestedHtml(latexPart, `latex-${latexIndex}`);
  });
};
