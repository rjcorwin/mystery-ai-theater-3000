package ai

import (
	"context"
	"encoding/base64"
	"fmt"
	"time"

	openai "github.com/sashabaranov/go-openai"
)

// Client is the interface the server uses for generating commentary.
type Client interface {
	GenerateCommentary(ctx context.Context, pngBase64 string) (string, error)
}

// OpenAIClient implements Client using OpenAI's API.
type OpenAIClient struct {
	client *openai.Client
}

func NewOpenAIClient(apiKey string) *OpenAIClient {
	return &OpenAIClient{client: openai.NewClient(apiKey)}
}

// GenerateCommentary sends an image to the model and returns XML-tagged dialogue.
// The output is expected to include <viewer-1> and <viewer-2> tags.
func (c *OpenAIClient) GenerateCommentary(ctx context.Context, pngBase64 string) (string, error) {
	// Construct a vision prompt
	prompt := `You are two snarky robots watching a human play a video game. 
Return short, funny, helpful commentary as XML with exactly two speakers:
<viewer-1>...</viewer-1>
<viewer-2>...</viewer-2>
Keep each line under 140 characters. Avoid profanity. Be witty.`

	// Build content with image
	// NOTE: Using responses API requires upgraded client; we fall back to ChatCompletions with image_url style
	req := openai.ChatCompletionRequest{
		Model: "gpt-4o-mini", // lightweight multimodal
		Messages: []openai.ChatCompletionMessage{
			{
				Role: openai.ChatMessageRoleUser,
				MultiContent: []openai.ChatMessagePart{
					{Type: openai.ChatMessagePartTypeText, Text: prompt},
					{
						Type:     openai.ChatMessagePartTypeImageURL,
						ImageURL: &openai.ChatMessageImageURL{URL: "data:image/png;base64," + pngBase64},
					},
				},
			},
		},
		Temperature: 0.8,
	}

	resp, err := c.client.CreateChatCompletion(ctx, req)
	if err != nil {
		return "", err
	}
	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("no choices from OpenAI")
	}
	return resp.Choices[0].Message.Content, nil
}

// Stub client returns canned lines when API key is missing.
type StubClient struct{}

func NewStubClient() *StubClient { return &StubClient{} }

func (s *StubClient) GenerateCommentary(ctx context.Context, pngBase64 string) (string, error) {
	// light time-based variation so it doesn't look static
	t := time.Now().UnixNano()
	v1 := "<viewer-1>Did they bind the jump key to a tea break?</viewer-1>"
	v2 := "<viewer-2>At this pace, the loading screen will lap them.</viewer-2>"
	if (t/1_000_000)%2 == 0 {
		v1 = "<viewer-1>Bold strategy: face-check every wall.</viewer-1>"
		v2 = "<viewer-2>The wall is winning 2–0.</viewer-2>"
	}
	// ensure base64 decodes for sanity (not strictly needed)
	if _, err := base64.StdEncoding.DecodeString(pngBase64); err != nil {
		// ignore decode error; just return lines
	}
	return v1 + "\n" + v2, nil
}
