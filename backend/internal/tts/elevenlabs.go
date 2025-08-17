package tts

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type ElevenLabsClient struct {
	APIKey  string
	ModelID string
	http    *http.Client
}

func NewElevenLabsClient(apiKey, modelID string) *ElevenLabsClient {
	if modelID == "" {
		modelID = "eleven_multilingual_v2"
	}
	return &ElevenLabsClient{
		APIKey:  apiKey,
		ModelID: modelID,
		http:    &http.Client{Timeout: 30 * time.Second},
	}
}

type ElevenVoice struct {
	VoiceID string `json:"voice_id"`
	Name    string `json:"name"`
}

type voicesResp struct {
	Voices []ElevenVoice `json:"voices"`
}

func (c *ElevenLabsClient) ListVoices(ctx context.Context) ([]ElevenVoice, error) {
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.elevenlabs.io/v1/voices", nil)
	req.Header.Set("xi-api-key", c.APIKey)
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("elevenlabs list voices: %s", string(b))
	}
	var vr voicesResp
	if err := json.NewDecoder(resp.Body).Decode(&vr); err != nil {
		return nil, err
	}
	return vr.Voices, nil
}

type synthReq struct {
	Text          string         `json:"text"`
	ModelID       string         `json:"model_id"`
	VoiceSettings map[string]any `json:"voice_settings,omitempty"`
}

func (c *ElevenLabsClient) Synthesize(ctx context.Context, voiceID string, text string) ([]byte, error) {
	body := synthReq{Text: text, ModelID: c.ModelID}
	payload, _ := json.Marshal(body)
	url := fmt.Sprintf("https://api.elevenlabs.io/v1/text-to-speech/%s", voiceID)
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	req.Header.Set("xi-api-key", c.APIKey)
	req.Header.Set("Content-Type", "application/json")
	// Request MPEG audio
	req.Header.Set("Accept", "audio/mpeg")
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("elevenlabs synth: %s", string(b))
	}
	return io.ReadAll(resp.Body)
}
