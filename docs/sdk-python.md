# Python SDK

English | [中文](sdk-python.zh.md)

Reference for using the Python SDK to control and extend DeepSeek Harness. The Python SDK mirrors the TypeScript client and runs in a bundled runtime.

## Installation

```bash
pip install deepseek-harness-sdk
```

Alternatively, install from source:

```bash
cd python
pip install -e .
```

## Client setup

```python
from deepseek_harness import HarnessClient

client = HarnessClient(transport='stdio', command='dsh', args=['--profile', 'headless'])
```

For in-process usage:

```python
from deepseek_harness import create_harness

harness = await create_harness(profile='headless')
```

## Session management

```python
session = await client.sessions.create()

# Send a prompt
response = await session.send("Summarize this file")

# Fork a session
forked = await session.fork()

# Resume a session
resumed = await client.sessions.get(session_id)
```

## Event stream

```python
async for event in session.events():
    if event.type == 'assistant/chunk':
        print(event.content, end='')
    elif event.type == 'tool/call':
        print(f"Tool called: {event.name}")
    elif event.type == 'session/complete':
        print("Session finished")
        break
```

## Tool registration

```python
from deepseek_harness import define_tool

@define_tool(
    name="calculate",
    description="Perform a calculation",
    parameters={
        "expression": {"type": "string", "required": True}
    }
)
async def calculate(args):
    return eval(args['expression'])  # use a sandbox in production

await session.register_tool(calculate)
```

## Error handling

```python
from deepseek_harness import HarnessError

try:
    await session.send(prompt)
except HarnessError as e:
    print(f"Harness error: {e.code} - {e.message}")
```

## Type hints

The SDK uses Python type hints extensively. Use `typing` and `pydantic` models for tool parameters.

```python
from typing import TypedDict

class CalculateArgs(TypedDict):
    expression: str

@define_tool(name="calculate", parameters=CalculateArgs)
async def calculate(args: CalculateArgs) -> float:
    return eval(args['expression'])
```

## Runtime environment

The Python SDK runs inside the bundled Python runtime included with the Harness. The runtime includes a pre-built distribution of CPython and the SDK wheels. See [python/README.md](../../python/README.md) for details.

## Reference

- [API Reference](api-reference.md) for full method signatures.
- [Python SDK guide](../user/guide/python-sdk.md) for a tutorial.
- [Session lifecycle](subsystems/session.md) for durable session semantics.
