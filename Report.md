# CSE5NLP Assessment 3

## Implementing NLP Solutions in Python

**Subject:** CSE5NLP — Natural Language Processing
**Term:** Term 3, 2026
**Name:** Nicholas Green
**Student ID:** 22840097
**Submission date:** 8 June 2026

---

## Abstract

This assignment implements three NLP components in Python. The first builds TF-IDF
weighting from scratch with NumPy and pandas and reproduces the expected weights on
a small reference corpus. The second tackles five-class sentiment classification of
COVID-19 tweets by turning each tweet into a single mean-pooled word2vec vector and
comparing a traditional classifier (logistic regression) against a neural network
(a small multilayer perceptron). The third fine-tunes a small pre-trained transformer
(`distilbert-base-cased`) for part-of-speech tagging on the English Web Treebank.
The TF-IDF functions match the reference output exactly. For the tweet task the MLP
reached 53.6% test accuracy versus 48.5% for logistic regression, both well above the
20% random baseline but limited by the mean-pooled representation. The fine-tuned
transformer reached 96.6% test token accuracy, comfortably above the 95% target. The
results show how representation quality, rather than classifier choice, dominates
performance on short, noisy text.

---

## Methodology

### Problem 1 — TF-IDF

I implemented the weighting directly rather than using a library so the maths is
explicit. `compute_tfidf_weights` first builds a sorted vocabulary across all
documents (sorting keeps the column order stable). Term frequency uses
*tf = log₁₀(count + 1)*, so a word missing from a document gives log₁₀(1) = 0 and
simply contributes nothing to that row. Document frequency is the number of documents
a term appears in, and inverse document frequency is *idf = log₁₀(N / df)*; a term that
appears in every document collapses to 0. `word_tfidf_vector` then multiplies a word's
TF column by its single IDF weight to give one value per document. The TF matrix is
stored as a pandas DataFrame and the IDF as a Series, which makes the lookups in the
second function straightforward.

### Problem 2 — Word embeddings for sentiment classification

The data is a COVID-19 tweet set with five sentiment labels (Extremely Negative,
Negative, Neutral, Positive, Extremely Positive). Preprocessing lowercases the text,
strips URLs, `@mentions` and the `#` symbol (keeping the hashtag word), removes any
non-letter characters, and splits on whitespace. Each remaining word is mapped to a
300-dimensional vector from the pre-trained `word2vec-google-news-300` model;
out-of-vocabulary words are ignored, and a tweet is represented by the **mean** of its
word vectors so every tweet becomes one fixed-length vector. Tweets left empty after
cleaning fall back to a zero vector. Labels were integer-encoded and the features
standardised (fitting the scaler on the training split only).

Two classifiers were trained on the same features so the comparison is fair: a
**logistic regression** model (the required traditional, non-neural baseline) and a
small **PyTorch MLP** (Linear → ReLU → Dropout → Linear) trained with cross-entropy
loss and the Adam optimiser. Both were evaluated on the provided test split using
accuracy and F1 (micro- and macro-averaged).

### Problem 3 — Fine-tuning a small LLM for POS tagging

This task fine-tunes `distilbert-base-cased` for token classification on the
`en_ewt` configuration of the Universal Dependencies dataset, predicting the `upos`
tag for each token. Because the words are pre-tokenised but the transformer uses
sub-word units, each label is aligned to the **first** sub-word of its word and the
remaining pieces (and special tokens) are set to -100 so they are ignored by the loss.
Training used the Hugging Face `Trainer` with a data collator that pads inputs and
labels per batch. Hyperparameters were a learning rate of 2e-5, batch size 16, weight
decay 0.01 and five epochs, evaluating on the validation split each epoch and keeping
the best checkpoint by accuracy. Training ran on an Apple-silicon GPU (MPS).

---

## Results and Discussion

### Problem 1

The functions reproduce the reference output exactly. For example `the`, which appears
in all three documents, has an IDF of 0, and the TF-IDF vector for `cat` is
`[0.053009, 0, 0.053009]` — non-zero only in the two documents that contain it. This
confirms the TF, IDF and combined weighting are all correct.

### Problem 2

| Classifier | Accuracy | F1 (micro) | F1 (macro) |
|---|---|---|---|
| Logistic Regression | 48.45% | 48.45% | 49.42% |
| Neural Network (MLP) | **53.55%** | 53.55% | 55.11% |

The MLP outperformed logistic regression by about five percentage points. Two things
are worth noting. First, micro-F1 equals accuracy here — that is expected for
single-label multiclass classification, where every prediction is either fully right
or fully wrong. Second, macro-F1 sits slightly *above* micro-F1 for both models, which
tells me the classifiers are not simply collapsing onto the largest classes; per-class
performance is reasonably even, helped by the fact that the dataset is only mildly
imbalanced.

The more important point is that both scores are only moderate. The bottleneck is the
representation, not the classifier. Averaging a tweet's word vectors throws away word
order and negation, so "not great" and "great" end up looking similar, and the
generic Google-News vectors were never trained on pandemic-era hashtags or Twitter
slang. The five-way distinction is also genuinely hard: "Extremely Positive" and
"Positive" overlap heavily in vocabulary, so confusions between adjacent sentiment
grades are common. A stronger representation (for example contextual sentence
embeddings) would likely help far more than swapping the classifier.

![Problem 2 — MLP confusion matrix on the test set](fig_p2_confusion_mlp.png)

The confusion matrix makes this concrete: most of the errors are between *neighbouring*
sentiment grades (Positive vs Extremely Positive, Negative vs Extremely Negative)
rather than across the sentiment spectrum, which is exactly what we would expect when
the representation captures broad polarity but not fine intensity.

### Problem 3

The model improved steadily and the best checkpoint was kept by validation accuracy:

| Epoch | Training loss | Validation loss | Accuracy | F1 | Precision | Recall |
|---|---|---|---|---|---|---|
| 1 | 0.1418 | 0.1453 | 0.9587 | 0.9318 | 0.9437 | 0.9227 |
| 2 | 0.0813 | 0.1281 | 0.9640 | 0.9409 | 0.9507 | 0.9332 |
| 3 | 0.0535 | 0.1295 | 0.9661 | 0.9442 | 0.9509 | 0.9384 |
| 4 | 0.0367 | 0.1359 | 0.9667 | 0.9439 | 0.9525 | 0.9363 |
| 5 | 0.0307 | 0.1400 | 0.9671 | 0.9458 | 0.9536 | 0.9390 |

![Problem 3 — distilBERT training curve](fig_p3_learning_curve.png)

On the held-out **test** split the model reached:

```
accuracy = 0.9657,  f1 = 0.9533,  precision = 0.9573,  recall = 0.9497
```

Test accuracy of 96.6% clears the 95% target. The training loss keeps falling while the
validation loss flattens after epoch 2, the usual early sign of mild overfitting, but
validation accuracy still nudges up each epoch so the extra epochs were not harmful.
The contrast with Problem 2 is the main lesson of the assignment: the same underlying
idea (words as vectors) performs very differently depending on how it is used. A
fine-tuned transformer produces *contextual* representations and is trained end-to-end
for the task, so it vastly outperforms static word2vec vectors that are averaged and
fed to a shallow classifier.

---

## Conclusion

All three components met their goals: the from-scratch TF-IDF matches the reference
exactly, the tweet classifiers run end-to-end with the MLP edging out logistic
regression (53.6% vs 48.5%), and the fine-tuned distilBERT reaches 96.6% test accuracy
on POS tagging. The clearest finding is that representation matters more than the
choice of classifier: mean-pooled static embeddings cap performance on short, noisy
sentiment text, whereas contextual transformer embeddings handle the structured
tagging task with ease. Natural extensions would be to use contextual or fine-tuned
sentence embeddings for the tweet task, to address class overlap between adjacent
sentiment grades, and to add early stopping for the transformer to curb the small
amount of overfitting seen after epoch 2.
