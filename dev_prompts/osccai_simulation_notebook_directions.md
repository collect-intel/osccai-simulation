<prompt>
You are an expert Python developer tasked with creating a Jupyter notebook to simulate output from an Open Source Collective Constitutional AI (OSCCAI) tool. The notebook will generate a realistic Vote Matrix based on simulated LLM responses. Follow these instructions precisely:

Review the attached flow in markdown, which outlines the desired steps for the notebook.
Create a comprehensive, well-structured Python notebook that implements this flow. Include the following:
a. Clear markdown cells explaining each step
b. User input cells where specified
c. Calculation cells based on provided metrics
d. LLM prompting cells with optimal prompts
e. Data extraction cells to process LLM responses
For each LLM prompt:
a. Use best practices (delimiters, XML-like tags, JSON output for API compatibility)
b. Implement Chain of Thought reasoning
c. Optimize for token limit efficiency
d. Specify exact expected response format
Ensure the notebook is modular, well-commented, and follows PEP 8 style guidelines.
Include error handling and input validation where appropriate.
Add visualization cells to display the final Vote Matrix and other relevant data.
Provide a requirements.txt file for any necessary libraries.
Include a markdown cell at the top of the notebook with usage instructions and any required API keys or setup.

Output your complete, ready-to-run Python notebook code as a single code block. Do not omit any code or use ellipses. If you need clarification on any step, ask before providing the final code.
</prompt>

# OSCCAI Simulation Notebook

## 1. Setup and Imports
- Import required libraries (numpy, pandas, matplotlib, json, openai)
- Set up OpenAI API key

## 2. User Input Collection
2.1. Collect Community Information:
   - Prompt user for:
     a. Community name
     b. Community description
     c. Community goals for AI model
   - Consolidate inputs into a single community description

2.2. Collect Simulation Parameters:
   - Prompt user for:
     a. Number of subgroups (G)
     b. Total number of participants (P)
     c. Statement format (default: "The best response is one that...")

## 3. Simulation Setup Calculations
3.1. Calculate participants per group (Pg):
   - Implement algorithm to distribute P among G groups
   - Ensure variability without extreme disparities
   - Implement this algorithm in a function called `calculate_participants_per_group` that takes G and P as input and returns a list of Pg values for each group.

3.2. Calculate statements per participant:
   - Use real-world data distribution to determine range and probability
   - (Do not implement this algorithm, just specify the function name and expected output)

3.3. Calculate vote distribution per participant:
   - Use real-world data to set agree/disagree/pass probabilities
    (Do not implement this algorithm, just specify the function name and expected output)

## 4. LLM Interaction for Group and Participant Generation
4.1. Construct LLM prompt for group and participant generation:
   - Include community description, G, and Pg values
   - Specify JSON output format
   - Use the following prompt as a guide:
   <prompt>
    You are tasked with creating realistic subgroups and participants for a community simulation. Use the following information to generate detailed descriptions:

    Community Description: {community_description}
    Number of Subgroups: {G}
    Participants per Group: {Pg_list}

    For each subgroup:
    1. Provide a 2-sentence description of the subgroup.
    2. Generate {Pg} unique, 1-sentence descriptions of individuals who could belong to this subgroup.

    Ensure descriptions are diverse and realistic within the context of the community.

    Return your response in the following JSON format:
    {
    "subgroups": [
        {
            "description": "Subgroup description",
            "participants": ["Participant 1 description", "Participant 2 description", ...]
            },
            ...
    ]
    }
    </prompt>

4.2. Send prompt to LLM and receive response

4.3. Parse LLM response:
   - Extract group descriptions
   - Extract participant descriptions and group assignments

## 5. LLM Interaction for Statement Generation
5.1. Construct LLM prompt for statement generation:
   - Include community description, group descriptions, participant descriptions
   - Specify number of statements per participant
   - Specify JSON output format
   - Use the following prompt as a guide:
   <prompt>
    Generate statements for a community AI model alignment survey. Use the following information:

    Community Description: {community_description}
    Statement Format: "{statement_format}"

    For each participant, generate the specified number of unique statements that align with their subgroup and individual characteristics. Ensure statements are diverse and relevant to the community's goals.

    Subgroups and Participants:
    {subgroups_and_participants_json}

    Return your response in the following JSON format:
    {
    "statements": [
        {
        "participant_id": "Unique identifier",
        "statements": ["Statement 1", "Statement 2", ...]
        },
        ...
    ]
    }
    </prompt>

5.2. Send prompt to LLM and receive response

5.3. Parse LLM response:
   - Extract statements and assign to participants

## 6. LLM Interaction for Vote Simulation
6.1. Construct LLM prompt for vote simulation:
   - Include full list of statements
   - Include community, group, and participant descriptions
   - Specify assigned statements and target vote distribution per participant
   - Specify JSON output format
   - Use the following prompt as a guide:
   <prompt>
    Simulate voting patterns for a community AI model alignment survey. Use the following information:

    Community Description: {community_description}
    Statements:
    {numbered_statements_list}

    For each participant, determine how they would likely vote on their assigned statements. Use the following voting options:
    1 = Agree
    -1 = Disagree
    0 = Pass

    Participants and Voting Assignments:
    {participants_and_assignments_json}

    Ensure that each participant's voting pattern closely matches their target vote distribution.

    Return your response in the following JSON format:
    {
    "votes": [
        {
        "participant_id": "Unique identifier",
        "votes": {"statement_id": vote, ...}
        },
        ...
    ]
    }
    </prompt>

6.2. Send prompt to LLM and receive response

6.3. Parse LLM response:
   - Extract votes and assign to participants

## 7. Vote Matrix Generation
7.1. Create empty matrix (rows = participants, columns = statements)

7.2. Populate matrix with extracted votes:
   - 1 for Agree, -1 for Disagree, 0 for Pass, null for no vote

## 8. Results Visualization and Analysis
8.1. Generate heatmap of Vote Matrix

8.2. Calculate and display vote distribution statistics

8.3. Visualize subgroup voting patterns

## 9. Error Handling and Input Validation
- Implement try-except blocks for API calls and data processing
- Validate user inputs and LLM outputs

## 10. Documentation and Comments
- Add markdown cells explaining each major step
- Include inline comments for complex operations

## 11. Notebook Finalization
- Run all cells to ensure functionality
- Clear all outputs for clean initial state