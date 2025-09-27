import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: ${props => props.theme.typography.fontFamily.primary};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: ${props => props.theme.modes[props.theme.mode].backgrounds.primary};
    color: ${props => props.theme.modes[props.theme.mode].text.primary};
    transition: background-color 0.4s ease, color 0.4s ease;
    line-height: ${props => props.theme.typography.lineHeight.normal};
    font-size: ${props => props.theme.typography.fontSize.base};
  }

  #root {
    min-height: 100vh;
  }

  /* Professional button styling */
  button {
    font-family: inherit;
    cursor: pointer;
    border: none;
    outline: none;
    transition: all ${props => props.theme.transitions.base};
    font-weight: ${props => props.theme.typography.fontWeight.medium};
    border-radius: ${props => props.theme.borderRadius.md};
  }

  /* Form elements */
  input, select, textarea {
    font-family: inherit;
    outline: none;
    transition: all ${props => props.theme.transitions.base};
    border-radius: ${props => props.theme.borderRadius.md};
    border: 1px solid ${props => props.theme.modes[props.theme.mode].borders.primary};
    background-color: ${props => props.theme.modes[props.theme.mode].backgrounds.secondary};
    color: ${props => props.theme.modes[props.theme.mode].text.primary};
    
    &:focus {
      border-color: ${props => props.theme.kpi.highlight};
      box-shadow: 0 0 0 3px ${props => props.theme.kpi.highlight}20;
    }
  }

  a {
    text-decoration: none;
    color: inherit;
    transition: color ${props => props.theme.transitions.fast};
  }

  /* Professional scrollbar styling */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    background: ${props => props.theme.modes[props.theme.mode].backgrounds.tertiary};
  }

  ::-webkit-scrollbar-thumb {
    background: ${props => props.theme.modes[props.theme.mode].text.muted};
    border-radius: ${props => props.theme.borderRadius.full};
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${props => props.theme.modes[props.theme.mode].text.secondary};
  }

  /* Loading and animation keyframes */
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideIn {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  /* Utility classes for consistent spacing */
  .fade-in {
    animation: fadeIn 0.6s ease-out;
  }

  .slide-in {
    animation: slideIn 0.4s ease-out;
  }

  /* Professional card shadows */
  .card-shadow {
    box-shadow: ${props => props.theme.shadows.base};
  }

  .card-shadow-hover {
    box-shadow: ${props => props.theme.shadows.md};
  }

  /* Text utilities */
  .text-primary {
    color: ${props => props.theme.modes[props.theme.mode].text.primary};
  }

  .text-secondary {
    color: ${props => props.theme.modes[props.theme.mode].text.secondary};
  }

  .text-muted {
    color: ${props => props.theme.modes[props.theme.mode].text.muted};
  }

  .text-accent {
    color: ${props => props.theme.kpi.highlight};
  }
`;

export default GlobalStyles;