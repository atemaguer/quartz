---
title: "How ChatGPT Learns to Converse and Reason"
date: "2025-09-06"
tags:
  - seed
---

Base large language models—models that have only been pre-trained on raw text and not yet fine-tuned—are often difficult to prompt or work with, requiring painstaking amounts of prompt engineering to achieve results. Post-training or fine-tuning is a workaround that allows teaching base models to be helpful and friendlier to use, especially for non-technical users. The resulting artifact from this process is typically a chat assistant like ChatGPT or Grok.

Training a base model to mimic and assume the persona of a chatbot involves formatting text data in a chat format and then fine-tuning the model on many examples of conversations in that format. The model learns to imitate the pattern. As an example, let's consider a very simple chat format involving a conversation between an LLM assistant and a user:

**Basic Chat Format:**
```text
User: Hi Chat
Assistant: Hi there, how may I help you?
User: Chat, explain quantum mechanics to me like a five year old.
Assistant: Sure, I can help with that! Quantum mechanics....
```

Believe it or not, this simple chat format was the one used in the first Claude version released in early 2023.

Once the model has been fine-tuned to follow a chat format, it starts to behave like a chatbot. This simplistic format can be further improved by adding custom tokens—special strings added to the model's vocabulary during training—to denote and differentiate between assistant and user messages. These tokens typically use unusual character sequences like `<|...|>` to avoid collision with natural language. In the basic format above, the delimiter between user and assistant messages is just the newline character `\n` and the `User:` and `Assistant:` prompts.

With this foundation in mind, let's talk about the popular chat formats out there and how each implements special tokens. The two formats we'll cover are ChatML and Harmony.

---

## ChatML

ChatML stands for Chat Markup Language. It's a chat format inspired by XML and used by most open source language models like Qwen from Alibaba. The [original spec](https://github.com/openai/openai-python/blob/v0.28.1/chatml.md) can be found in older versions of OpenAI's Python repository. The special tokens in the basic ChatML format are `<|im_start|>` and `<|im_end|>`, which denote conversation message boundaries.

**ChatML Format:**
```xml
<|im_start|>user
Hi Chat<|im_end|>

<|im_start|>assistant
Hi there, how may I help you?<|im_end|>

<|im_start|>user
Chat, explain quantum mechanics to me like a five year old.<|im_end|>

<|im_start|>assistant
Sure, I can help with that! Quantum mechanics....<|im_end|>
```

---

## Harmony

The other popular chat format is [Harmony](https://github.com/openai/harmony), created and used by OpenAI for all their chat completion and responses API models. Harmony is similar to ChatML in structure, but more complex with many more special tokens.

The basic tokens are:
- `<|start|>` — begins a message
- `<|end|>` — ends a message
- `<|message|>` — marks message content
- `<|channel|>` — specifies output channel (analysis, commentary, final)
- `<|return|>` — ends the final user-facing message

The assistant has to specify which channel the message is being output to. Only messages on the "final" channel are shown to the user—other channels like "analysis" and "commentary" are hidden and used for internal reasoning or tool orchestration.

**Harmony Format:**
```xml
<|start|>user<|message|>Hi Chat<|end|>

<|start|>assistant<|channel|>final<|message|>
Hi there, how may I help you?<|return|>

<|start|>user<|message|>
Chat, explain quantum mechanics to me like a five year old.<|end|>

<|start|>assistant<|channel|>final<|message|>
Sure, I can help with that! Quantum mechanics....<|return|>
```

---

## Reasoning

Chat models are helpful and usable enough for most non-reasoning tasks. However, for reasoning-intensive queries—math problems, multi-step logic, coding challenges—we would love our assistants to spend time thinking and reasoning through the task before outputting a final solution. This need for extra thinking time motivated extending the basic chat formats to include a scratchpad for the assistant to think.

### ChatML Reasoning

ChatML achieves this by introducing special `<think>` and `</think>` tokens where the assistant can perform reasoning before outputting a final answer:

```xml
<|im_start|>user
Chat, explain quantum mechanics to me like a five year old.<|im_end|>

<|im_start|>assistant
<think>
The user has asked me to explain quantum mechanics to them in a way
that a five year old might understand. First let's start by identifying
what concepts a five year old understands about the world that we can
use as analogies to explain quantum mechanics concepts.....
</think>

Sure, I can help with that! Quantum mechanics....<|im_end|>
```

As shown above, the assistant can now first reason through the problem in between the "think" tokens before giving a final answer. The content inside these tokens is typically hidden from the user in the final output. This "chain of thought" approach has been shown to dramatically improve performance on reasoning tasks—models like DeepSeek-R1 and OpenAI's o1 are built around this idea.

### Harmony Reasoning

Harmony handles reasoning differently—through channel tokens. The assistant uses the `analysis` channel for reasoning (as we'll see later, channels can also be used for tool calling):

```xml
<|start|>user<|message|>
Chat, explain quantum mechanics to me like a five year old.<|end|>

<|start|>assistant<|channel|>analysis<|message|>
The user has asked me to explain quantum mechanics to them in a way
that a five year old might understand. First let's start by identifying
what concepts a five year old understands about the world that we can
use as analogies to explain quantum mechanics concepts.....<|end|>

<|start|>assistant<|channel|>final<|message|>
Sure, I can help with that! Quantum mechanics....<|return|>
```

---

## Tool Use

Sometimes we want our chat assistants to be able to interact with external systems like databases and the internet to retrieve information that is not present in their training data. This is achieved through a technique called tool use (or function calling).

Assistants are provided with a set of function definitions in JSON or TypeScript format, which they can use as tools to solve problems. For instance, we can provide an assistant with a tool to retrieve weather updates, allowing it to answer weather queries with real-time information.

Tool definitions are provided through a **system prompt** (or **developer prompt**), which provides instructions and guidelines for the assistant to follow, as well as contextual information like the current date. Let's see how each format handles tool use.

### ChatML Tool Use

ChatML uses the system message to specify assistant identity, tool definitions, and any relevant context. It uses JSON schema to define tools and special `<tool_call>` tokens to invoke them:

**System Message with Tools:**
```xml
<|im_start|>system
You're ChatML, a helpful chat assistant.

# Tools

You may call one or more functions to assist with the user query.

<tools>
{
  "type": "function",
  "function": {
    "name": "get_weather",
    "description": "Get weather for a city",
    "parameters": {
      "type": "object",
      "properties": {
        "city": {"type": "string"},
        "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}
      },
      "required": ["city"]
    }
  }
}
</tools>

For each function call, return a json object within <tool_call> tags.<|im_end|>
```

**Tool Call Example:**
```xml
<|im_start|>user
What's the current weather in San Francisco?<|im_end|>

<|im_start|>assistant
<think>
The user wants to know the weather in San Francisco.
Need to call get_weather function.
</think>

I'll check the current weather in San Francisco for you.

<tool_call>
{"name": "get_weather", "arguments": {"city": "San Francisco", "unit": "celsius"}}
</tool_call><|im_end|>

<!-- The orchestration layer executes the tool and returns the result as a user message -->
<|im_start|>user
<tool_response>
{"temperature": 22, "condition": "partly cloudy", "humidity": 65}
</tool_response><|im_end|>

<|im_start|>assistant
The current weather in San Francisco is 22°C with partly cloudy skies
and 65% humidity.<|im_end|>
```

Note that the tool response comes back in a `user` message. This is because an orchestration layer outside the model executes the tool call and injects the result back into the conversation.

### Harmony Tool Use

Harmony uses the `commentary` channel to call tools, with a distinct `<|call|>` token to signify tool invocations.

One key difference is that Harmony places tool definitions in the **developer message** rather than the system message. This design decision, called **prompt hierarchy**, was inspired by the need to mitigate prompt injection attacks—where malicious user input tries to override system instructions. With prompt hierarchy, the assistant weights instructions from different message types with differing levels of trust:

1. **System messages** — highest trust
2. **Developer messages** — medium trust
3. **User messages** — lower trust
4. **Tool responses** — least trusted

**Harmony Tool Definition:**
```typescript
// Developer message uses TypeScript-style definitions
namespace functions {
  // Get weather for a city
  type get_weather = (_: {
    city: string,
    unit?: "celsius" | "fahrenheit",
  }) => any;
}
```

**Harmony Tool Call:**
```xml
<|start|>user<|message|>
What's the current weather in San Francisco?<|end|>

<|start|>assistant<|channel|>commentary<|message|>
I'll check the current weather in San Francisco for you.<|end|>

<|start|>assistant<|channel|>commentary to=functions.get_weather<|constrain|>json<|message|>
{"city": "San Francisco", "unit": "celsius"}<|call|>

<|start|>functions.get_weather to=assistant<|channel|>commentary<|message|>
{"temperature": 22, "condition": "partly cloudy", "humidity": 65}<|end|>

<|start|>assistant<|channel|>final<|message|>
The current weather in San Francisco is 22°C with partly cloudy skies
and 65% humidity.<|return|>
```

A few things to note: the `to=functions.get_weather` directive specifies which function to call, and `<|constrain|>json` tells the model to output valid JSON for the function arguments. The `functions.get_weather` label with a `to` directive in the response is how the orchestration layer returns the tool result back to the assistant.

---

## Conclusion

At its core, teaching a language model to converse and reason comes down to formatting. By structuring text data in specific chat formats and fine-tuning models to imitate them, we get the helpful chat assistants we interact with today.

We've covered the two dominant formats—ChatML and Harmony—and seen how they handle the basics of conversation, reasoning, and tool use. ChatML takes a simpler, XML-inspired approach with dedicated tokens for thinking and tool calls. Harmony is more complex, using channels to route different types of assistant output and a trust hierarchy to mitigate prompt injection attacks.

These formats will likely continue to evolve as we discover new capabilities we want our assistants to have. But the fundamental idea remains the same: define a structured format, train the model to follow it, and you get a new behavior. It's a surprisingly simple recipe for teaching machines to think.
