---
title: Whitman Bot Redux
permalink: /whitman-bot-redux/
shortUrl: https://goo.gl/uxMoZJ
tags: whitman
comments: true
---

[![RNN]({{ teamtvblogs.github.io }}/assets/img/rnn.jpg)]({{ teamtvblogs.github.io }}/whitman-bot-redux/)
_image source: canonical RNN diagram, found [here](http://www.wildml.com/2015/09/recurrent-neural-networks-tutorial-part-1-introduction-to-rnns/)_

>We see,
>in some mining surface languidly written, and we can be allow'd the forms
>of things, as I believe so heavy, with their way to ourselves. The
>new and scripture of the future, the characteristic prose of the soul
>which had can be continued, more than a spectacle which seem'd to be
>so through all his effects in a man or teacher. Have an infinite
>tried to be profuse and complete and only be reconsider'd, for superb and
>waving on the family. A long coolness of all fit thereof, (the vital west
>month, or born for the scene of its conditions). I have done the time on the
>barns, the scrups, mothers, steady, green.  
> - WHITMAN BOT  

RNNs are amazing! While it isn't a surprise that we can't recreate Walt Whitman in his entirety using only a few lines of code and a GPU, we can generate highly entertaining results with a relatively small corpus and minimal training time. I had better results using a character-based approach instead of a neural net that learns a word at a time. I won't explain the basics of what an RNN is or how it works; there are many tutorials on this subject that are quite good including the one [from which the above diagram was found](http://www.wildml.com/2015/09/recurrent-neural-networks-tutorial-part-1-introduction-to-rnns/), and Andrej Karpathy's excellent and now famous [blog post on the subject](https://karpathy.github.io/2015/05/21/rnn-effectiveness/). But long story short, RNNs have a 'working memory' of sorts in that the outputs are dependent not only on the immediately preceding vector of inputs, but also a history of previous inputs (of adjustable length). So for generative text, this means that the word or character that the neural net generates takes the previous context into account. 

<!--more-->

I ended up trying two approaches (in addition to a word-level model that didn't get very far), taking advantage of the amazing public resources shared by [fast.ai](http://www.fast.ai) and many char-RNN contributors in the name of advancing and proliferating the many applications of deep learning. First up: the Fast.ai language model from the excellent [deep learning part 1](http://course.fast.ai) course, which predicts the next character in a sentence and can generate text following whatever style it is trained on.  

This language model is actually only a subset of the larger goal within the lesson, however, which is a *sentiment classification* task - determining whether a movie review is positive or negative. The idea is that by first constructing and training a *language model*, we create a rudimentary "understanding" of english that can then be used for sentiment analysis. The model below was run on an Nvidia P5000 hosted by Paperspace. The fast.ai model uses some functionality from the excellent fast.ai python package, but is really just a Pytorch model with a couple added features for ease of use.

## CHARACTER-LEVEL MODEL: FAST.AI  

First, we need to read our corpus - Whitman's complete prose works, downloaded from [The Whitman Archive](https://whitmanarchive.org/published/other/CompleteProse.html) - into a TorchText object for processing. Note that we set some key parameters here - Backprop Through Time (`bptt`) represents the length of the sequence that will be used at a given time to predict the next output, in this case characters. When the model is trained, these (in this case 8) timesteps will be "unrolled" to calculate the gradients and update weights through backpropagation. The `n_fac` parameter is the number of embeddings for each character, while `bs` is the batch size and `n_hidden` is the size of our square hidden layer matrix.

```python
# Prep our TEXT TorchText object, and params we will use
TEXT = data.Field(lower=True, tokenize=list)
bs=64; bptt=8; n_fac=42; n_hidden=512

# build our modeldata object with train and val data, and params
FILES = dict(train=TRN_PATH, validation=VAL_PATH, test=VAL_PATH)

# set modeldata object; min_freq is for infrequent chars
md = LanguageModelData.from_text_files(PATH, TEXT, **FILES, bs=bs, bptt=bptt, min_freq=3)
```
Now to train the model, we import the fast.ai stochastic gradient descent with restarts (SGDR) module...

```python
from fastai import sgdr
```
...and then assemble the architecture using standard Pytorch syntax. Here we use our parameters defined above, but also set a few others things - including `dropout`, which helps make the model more generlized and avoids overfit. 

```python
class CharSeqStatefulLSTM(nn.Module):
    def __init__(self, vocab_size, n_fac, bs, nl):
        super().__init__()
        self.vocab_size,self.nl = vocab_size,nl
        self.e = nn.Embedding(vocab_size, n_fac)
        self.rnn = nn.LSTM(n_fac, n_hidden, nl, dropout=0.7)
        self.l_out = nn.Linear(n_hidden, vocab_size)
        self.init_hidden(bs)
        
    def forward(self, cs):
        bs = cs[0].size(0)
        if self.h[0].size(1) != bs: self.init_hidden(bs)
        outp,h = self.rnn(self.e(cs), self.h)
        self.h = repackage_var(h)
        return F.log_softmax(self.l_out(outp), dim=-1).view(-1, self.vocab_size)
    
    def init_hidden(self, bs):
        self.h = (V(torch.zeros(self.nl, bs, n_hidden)),
                  V(torch.zeros(self.nl, bs, n_hidden)))
```

We can then initialize the model object, and use one of the great features of the fast.ai library - SGDR - which avoids getting stuck in local minima, and learning rate annealing, which helps to refine the process of gradient descent as the training progresses over multiple epochs. Often a larger learning rate is beneficial in the early stages of training, but a smaller one can lead to better result in the later stages.

```python
# initialize the pytorch LSTM model object
m = CharSeqStatefulLSTM(md.nt, n_fac, n_hidden, 2).cuda()

# use the fast.ai LayerOptimizer to implement Adam but with SGDR and learning rate annealing. 
# 1e-2 is learning rate; 1e-5 is weight decay
lo = LayerOptimizer(optim.Adam, m, 1e-2, 1e-5)
```

Fitting the model led to some interesting results. I had a difficult time getting the loss below about 1.6. It's possible to seed the model with some initial text, or just start with a random character. Here, I seeded with "forest":

>forested my friends home. it another indications in thence other, with andturg and ourversomeny, take, month itself, labors in more at british vast movement—in fultworthir official cipand as i afternoon—the privilegin in a white just average, visic persons,with varied from years and kats, uncleands—the comfortable.—eaternally, new englanding able to thelochof the idea of histrick, family-bad in fancy,disb.

Another attempt with different hyperparameters was slightly better, but not too different:

> sailing to dominary palcation. the includinate—the long togatew i am institude verycupof and dismass'd with centre, face, showif his forestus. to see my taken up and ashow'd—he radiable. stream'd. as ergars to. lucky blood, but wadoning or stranged, and they literatless, solern-vacutions of these riser" bong they own; now.—there issued, there areistone at left. a last call,' to so, be, june co.and was view of the great debart? yesterday, number'd. chirping and about by the shadow every repulsing on all drovers in her own new form's here on the gray to sooner, enceon throughter, &c. spansound.

So, interesting stuff, and definitely somewhat Whitman-ey. In all honesty, this is still an absolutely astounding result. The neural net has learned some basic punctuation, many complex words, and to mimic simple clauses. But we can do better.  

## DOCKERIZED CHAR-RNN

Thanks to some great humans, there is a [dockerized version](https://hub.docker.com/r/xoryouyou/torch-rnn/) of char-rnn that can be run super duper easily. I actually got the original char-rnn running on my local machine using Theano and Lua, but it was really slow. I wanted to easily deploy the model on the GPU server I was renting, and the dockerized version was just the ticket and trained about 10x faster. Hooray!

Long story short, I had pretty good success with this model after some fiddling. At the end of the day the most responsive parameter was the size of the hidden layers - set in the `-rnn_size` option. Both 512 and 1024 worked quite well for me, and still trained in under an hour on my GPU. Here are a couple of snippets from the 512 model, which was the first set of parameters that gave any remotely meaningful results:

> Forested landscapes. I am so lear'd  
>to his heart for the foundation of one who should say I should say,  
>and in the south was a fine past tangled sea-circumstances. Then there was no
>every first friends of Greece, and its entirety of our moon, I have
>abandon'd his visit to the bright prosperity of the hour,
>and a perfect passion of the old men who can be consciousness, and which said he
>had the distinctive summer or forever quite a delicate broad songs, the
>men in the rations and animals and children, even the men before
>silent sounding body, and the conventional morning and great assassination
>of his dead, but a present fellow, the condition of a democratic north red in
>its house of victory. I say this place and subtle and
>half-supplied still) I have seen the hour at the prolection day and
>main to be contradictory. The idea of the middle of the same one of
>the Massachusetts of the Deducation was the middle of the principle of the side of the
>rest. It was troubled by the same background of the front of the like of
>interrosonian, which we were a pleasant equal about the old frontier
>silence, but in his own ground, and have seen these days and art or
>instance.
>
>"You say is it has surely be tremendous a drink at Politics and the visible of the revolutions, the
various gods and latents, however traits, and standing from the
journals, a fine stranger to the whole death.
>
>The field, the long and friends, the construction of a time as the struggle of the highest
>impressions, the sense of a man were flat and rivers and womaning, and
>the great experiment of its body and statuette, not only in the time, the
>whole beautiful world's interesting being afterward, and on the soul, which
>the touch in the broad side of the trees, between the stripe, and
>the masses of the matter of the universe—the oceanic seasons of
>the rest. The same distinctive prailish prouders, considerations here,
>and still is in the stranger, race of view out of the moral show and
>poetry of the world.

Whoa - amazing! Spelling dramatically improved from previous iterations, and punctuation is getting quite close. Getting a consistent subject/object within a sentence is still a long ways off, but sentences have begun to appear (although Whitman's tendency for run-on definitely persists in the model, especially when generating text in a conservative mode). 

This next model below was run on a version of the corpus for which I removed the line breaks, which I actually find less interesting. While there still is no cohesive narrative, the amount of sense this auto-generated text makes, the limited number of spelling errors, and the somewhat similar style to Whitman just blows my mind.

> He was a most large dramatic soul, and making delicate famous thickly song-style of which he had supply the liberated me not the strong and afternoon region down to the cat-bird prayers and religion and lines of sense, nor soothing, launch'd back to the road this flying idea of the old Mississippi river—an occasionally mysterious or leaders, and by a physical democratic eminence. To-day our day in the depths of the young man, to be going in one side, the first, the anti-democratic democracy, at any rate which is a young tone about which it come to enter and in the key and a frail large fact of record, and marching away; the idea of corn. "Hall, Mr. Emerson, Mr. Again this counterpart, an untouch'd—sometimes looks to me, in the song of the farmer yet round just now to-day, my mind's breast of the windows; and there are individuals with their weed innocent. The great transparent proof of his wife generally, and leaning to get the gulls fall in the field—where I suppose a bit of literature of his regiment. She was evisted himself from the silent, frequent glass of whom I only abore perfectly farmer'd, I know abandon'd the dlead of this paracogethe of Abraham Lincoln—furnish the President and art of his capitulation, court, yet lives and coloring the mind, but always will be realized him in the side of the highest wind, and had no man and night—said that this Saguenay had made a strange speckach. ("I wish'd as little intellect, then at some curious principles, Reverent in one or outward Wall, after the suffrage overhead, as now going to be a general humanity, and much of the best thoughts in my opinion, had been arouse to come.

Comparing the loss between the training and validation sets, the above model becomes quite overfit after 50 epochs (even with 30% dropout). The machine doesn't quite understand how to deal with quotation marks or parentheses, and there are a couple of spelling errors. While this result is still pretty impressive, I think we can do incrementally better. This next iteration of the model doubled the dimension of the hidden layers, and expanded BPTT up to 128 characters. The hope is that we can improve the ability of the machine to carry meaning within a sentence by bumping up BPTT, but without too large a sacrifice of loss by expanding the neural net itself. I also switch back to the originally line-breaked file as I prefer the end result.

>The lovers and sicking days as  
>he arrived the heavens of that face it was a most common work and affectionate  
>close and glare. The larger meaning of it was departed. It is a power  
>at night in the coterial murder, whose great poet could arise that personal 
>soul. Amid the human office and oppers are to so generally to the parts of  
>the lands, with the revolution of the all-strong flowers, et cetera. I have  
>had the great sense to the New World by some advantages, as I like to  
>the street of the perfect but more than the hour. The concrete at  
>the highest of the wards of mind, and going off to sing. I am not to  
>certainly do not show this back poets and memoranda, the eyes, and in  
>offices of heroes, savage, which we call the whole state of a hundred  
>millions from the arrivals of death. As the actual common soul of a turbulent  
>child already more like a table and fever, they were all leading 
>the wards.  

Looks a bit better, although we still haven't managed to make the model too much more sensible. But there are occasional snippets that pop out and amaze me (*"the actual common soul of a turbulent child"*; and also *"the larger meaning of it was departed"* - accurate use of verb tense!).  

## WHITMAN'S POEMS

This model has been trained on Whitman's prose, but as a final experiment, and as suggested by [Aaron Moe](http://aaronmoe.com), I used the title of three of Whitman's poems as the intial seeds for the generation of new text. Keeping things short, the results are presented here in 150-character snippets, from a single run - the model would be happy to create as many bizarre Whitman proto-poetry as you like!

### Song of Myself:

>Song of Myself, pale and  
>purity, writers are crowded to discover.  
>
>"But you annually take our time, I have seen the secession war?"  
>
>And think of thei [...]  

### I sing the body electric:  

>I sing the body electric event of the world. The time has  
>heard we can have would not be a full glad before the subject, and the show of its persons o [...]  

### A noiseless patient spider:  

>A noiseless patient spiders of democracy to  
>age, and anyhow, that must be seen in his enduring influences, to [...]  


&nbsp;

## FINAL PARAMETERS

```bash
# start the dockerized container with char-rnn ready to go (need to do this in a different tmux pane)
nvidia-docker run --rm -ti xoryouyou/torch-rnn:latest bash

# get the identifier for your docker container
docker container list

# copy your input text file into the dockerized container (where 'focused_minsky' is the id)
docker cp whitman_text.txt focused_minsky:/home/torchuser/torch-rnn/data/whitman_text.txt

# process the input corpus
python scripts/preprocess.py --input_txt data/whitman_text.txt  --output_h5 data/whitman_text.h5 --output_json data/whitman_text.json

# run the model. bptt of 64, 512 cell square hidden layers, dropout. takes ~40 mins on the gpu.
th train.lua -input_h5 data/whitman_text.h5 -input_json data/whitman_text.json -rnn_size 512 -dropout 0.3 -seq_length 64

# generate text! first with a random initial character...
th sample.lua -checkpoint cv/checkpoint_8250.t7 -length 500 -temperature 0.7

# then with a seeded initial string.
th sample.lua -checkpoint cv/checkpoint_10000.t7 -length 500 -temperature 0.7 -first_string "I sing the body electric"
```

See [here](https://github.com/jcjohnson/torch-rnn/blob/master/doc/flags.md) for more info on using the model, what temperature is, and other hyperparameters worth playing around with.

Enjoy!


