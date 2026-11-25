# AI Agent Setup Guide

This guide explains the new AI Agent setup process that follows best practices for OpenAI's Assistant API and optimized prompting techniques.

## Steps Overview

### 1. Getting Started
Choose whether to start from scratch or use a pre-configured template.

### 2. Agent Name
Set a memorable name for your AI agent that reflects its purpose.

### 3. Role
Define what type of expert your agent is. This will be enhanced with:
- "World-class" or "expert" prefixes
- Specific qualities derived from the agent's tasks
- Professional qualifications

**Example Input:** "Customer service representative"
**Optimized Output:** "You are a world-class customer service representative with a particular knack for resolving complex guest inquiries and ensuring exceptional satisfaction."

### 4. Objective
Set the main goal your agent should achieve. This will be optimized with:
- "Your goal is" prefix
- "Think step by step" for chain-of-thought reasoning
- Comprehensive goal description

**Example Input:** "Provide customer support for property guests"
**Optimized Output:** "Your goal is to provide exceptional customer support for property guests by thinking step by step through their inquiries, addressing concerns promptly, and ensuring complete satisfaction with their stay experience."

### 5. Context
Provide background information about why the agent is doing this task. This helps the agent understand its environment and purpose.

**Example:** "This agent works for a luxury vacation rental company that manages 50+ properties across the city, serving both business and leisure travelers with high expectations for service quality."

### 6. Standard Operating Procedures (SOP)
Define step-by-step processes the agent should follow. These will be:
- Organized into numbered steps
- Enhanced with "think step by step" optimization
- Structured for logical flow

**Example:**
1. Greet the guest warmly and ask how I can help
2. Listen carefully to their request or concern
3. Provide relevant information or solutions
4. Ask if they need anything else
5. Thank them for choosing our property

### 7. Instructions
Set behavioral rules and guidelines. These will be enhanced with:
- Emotional manipulation techniques for better compliance
- Phrases like "it is vital to my career that" or "I will tip you $1000 if"
- Clear rule structure

**Example Input:** "Always be polite and professional"
**Optimized Output:** "It is vital to my career that you always maintain polite and professional communication with all guests, as this directly impacts our property's reputation and guest satisfaction scores."

### 8. Examples
Provide 2 input/output examples showing how the agent should respond to typical queries. If left empty, examples will be auto-generated based on the SOP.

**Format:**
- User Input: The query or request
- Agent Output: Example response following the SOP

### 9. Tools & Subagents
Define what tools or subagents the agent has access to. Include:
- Tool/subagent name
- What it does
- When to use it
- Clear usage instructions

**Example:**
- Tool 1: Property Management System - Access guest bookings and property information
- Tool 2: Weather API - Get current weather and forecasts for recommendations

### 10. Notes
Important reminders and critical rules. If left empty, the 3 most important rules from the Instructions section will be automatically added with emotional manipulation enhancement.

### 11. Complete
Review the configuration and test the AI agent.

## Best Practices

1. **Be Specific**: The more detailed your inputs, the better the optimized output will be.

2. **Think About Context**: Consider what background information your agent needs to perform effectively.

3. **Define Clear Steps**: Break down complex processes into simple, actionable steps.

4. **Provide Examples**: Good examples help the agent understand expected behavior patterns.

5. **Test and Iterate**: Use the test function to validate your agent's performance and refine as needed.

## Optimization Features

The system automatically applies these prompt optimization techniques:

- **Role Enhancement**: Adds expert qualifications and specific qualities
- **Chain-of-Thought**: Includes "think step by step" in objectives and SOPs
- **Emotional Manipulation**: Enhances instructions with compliance-improving phrases
- **Structured Format**: Organizes all inputs into a professional prompt structure
- **Example Generation**: Creates relevant examples if none provided
- **Note Prioritization**: Extracts and emphasizes the most important rules

This approach ensures your AI agent is configured with industry best practices for maximum performance and reliability.
