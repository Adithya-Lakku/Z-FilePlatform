from langchain.agents import create_agent
from dotenv import load_dotenv
from agents.tools import list_files
from langchain.chat_models import init_chat_model
from dataclasses import dataclass  

load_dotenv()

@dataclass
class ResponseFormat:
    output:str
    




model = init_chat_model("google_genai:gemini-3.5-flash-lite",temperature=0.3)

agent  = create_agent(
    model=model
    ,tools=[list_files],
    system_prompt="list all files in the folder id ",
    response_format=ResponseFormat
    )

config = {'configurable': {'thread_id':1}}

result = agent.invoke(
    {
        "messages": [
            {"role": "user", "content": "list the contents of folder ef44c2e5-03e2-4208-bb8d-5d32e9c0042f "}
        ],
        
    },
    config=config,
    
)

for message in result["messages"]:
    print("\n--- MESSAGE ---")
    print(message)
print(result['structured_response'].output)