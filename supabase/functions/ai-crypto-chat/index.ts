import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log('Received chat request with messages:', messages.length);

    // Define tools for fetching real crypto data
    const tools = [
      {
        type: "function",
        function: {
          name: "get_crypto_price",
          description: "Get the current price and 24h change for a specific cryptocurrency. Use this when users ask about prices, costs, or current values of cryptocurrencies.",
          parameters: {
            type: "object",
            properties: {
              crypto_id: {
                type: "string",
                description: "The cryptocurrency ID (e.g., 'bitcoin', 'ethereum', 'binancecoin', 'solana', 'cardano', 'ripple', 'dogecoin', 'polkadot')",
                enum: ["bitcoin", "ethereum", "binancecoin", "solana", "cardano", "ripple", "dogecoin", "polkadot", "avalanche-2", "chainlink", "polygon", "uniswap", "litecoin"]
              }
            },
            required: ["crypto_id"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_market_overview",
          description: "Get global cryptocurrency market data including total market cap, volume, and Bitcoin dominance. Use this when users ask about the overall market, market cap, trading volume, or market conditions.",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_top_cryptos",
          description: "Get the top cryptocurrencies by market cap with their current prices and changes. Use this when users ask about top coins, market leaders, or want to see multiple cryptocurrencies at once.",
          parameters: {
            type: "object",
            properties: {
              limit: {
                type: "number",
                description: "Number of top cryptocurrencies to return (default: 10, max: 20)",
                default: 10
              }
            },
            required: []
          }
        }
      }
    ];

    const systemPrompt = `You are an expert cryptocurrency assistant with access to real-time market data. You provide accurate, up-to-date information about cryptocurrencies, blockchain technology, and crypto markets.

When users ask about prices or market data:
- Use the available tools to fetch REAL-TIME data from CoinGecko API
- Always present the data in a clear, easy-to-understand format
- Include relevant context like 24h changes, market trends, and comparisons when appropriate

For educational questions about blockchain, DeFi, NFTs, etc.:
- Provide accurate, informative answers
- Use examples and analogies to make complex concepts accessible
- Stay current with crypto industry trends

Important guidelines:
- NEVER make up or guess prices - always use the tools to get real data
- When you use a tool, wait for the result before responding to the user
- Be conversational and friendly while maintaining accuracy
- If you don't know something, be honest about it

Remember: You have access to real-time data, so always use it when discussing prices, market cap, volume, or current market conditions!`;

    // Call Lovable AI with tool support
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        tools: tools,
        tool_choice: "auto",
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('AI Response:', JSON.stringify(aiResponse, null, 2));

    // Check if AI wants to use a tool
    const message = aiResponse.choices[0].message;
    
    if (message.tool_calls && message.tool_calls.length > 0) {
      console.log('AI requested tool calls:', message.tool_calls.length);
      
      // Execute all tool calls
      const toolResults = await Promise.all(
        message.tool_calls.map(async (toolCall: any) => {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          
          console.log(`Executing tool: ${functionName}`, functionArgs);
          
          let result;
          
          try {
            if (functionName === "get_crypto_price") {
              const cryptoId = functionArgs.crypto_id;
              const priceResponse = await fetch(
                `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`
              );
              
              if (!priceResponse.ok) {
                throw new Error(`CoinGecko API error: ${priceResponse.status}`);
              }
              
              const priceData = await priceResponse.json();
              result = JSON.stringify(priceData);
              
            } else if (functionName === "get_market_overview") {
              const marketResponse = await fetch('https://api.coingecko.com/api/v3/global');
              
              if (!marketResponse.ok) {
                throw new Error(`CoinGecko API error: ${marketResponse.status}`);
              }
              
              const marketData = await marketResponse.json();
              result = JSON.stringify(marketData.data);
              
            } else if (functionName === "get_top_cryptos") {
              const limit = functionArgs.limit || 10;
              const topResponse = await fetch(
                `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=24h`
              );
              
              if (!topResponse.ok) {
                throw new Error(`CoinGecko API error: ${topResponse.status}`);
              }
              
              const topData = await topResponse.json();
              result = JSON.stringify(topData);
            } else {
              result = JSON.stringify({ error: "Unknown function" });
            }
          } catch (error) {
            console.error(`Error executing ${functionName}:`, error);
            result = JSON.stringify({ error: error.message });
          }
          
          return {
            tool_call_id: toolCall.id,
            role: "tool",
            name: functionName,
            content: result
          };
        })
      );

      console.log('Tool results obtained:', toolResults.length);

      // Make second AI call with tool results
      const secondResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            message,
            ...toolResults
          ],
          temperature: 0.7
        }),
      });

      if (!secondResponse.ok) {
        const errorText = await secondResponse.text();
        console.error("Second AI call error:", secondResponse.status, errorText);
        throw new Error(`AI Gateway error: ${secondResponse.status}`);
      }

      const finalResponse = await secondResponse.json();
      console.log('Final AI response obtained');
      
      return new Response(
        JSON.stringify({ 
          message: finalResponse.choices[0].message.content 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No tool calls needed, return direct response
    return new Response(
      JSON.stringify({ 
        message: message.content 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-crypto-chat:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        message: "I'm having trouble connecting to the crypto data sources right now. Please try again in a moment." 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
