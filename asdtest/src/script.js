new Vue({
    el: '#app',
    data: {
        questions: [
            { text: "I often notice small sounds when others do not" },
            { text: "I usually concentrate more on the whole picture, rather than the small details" },
            { text: "I find it easy to do more than one thing at once" },
            { text: "If there is an interruption, I can switch back to what I was doing very quickly" },
            { text: "I find it easy to ‘read between the lines’ when someone is talking to me" },
            { text: "I know how to tell if someone listening to me is getting bored" },
            { text: "When I’m reading a story I find it difficult to work out the characters’ intentions" },
            { text: "I like to collect information about categories of things" },
            { text: "I find it easy to work out what someone is thinking or feeling just by looking at their face" },
            { text: "I find it difficult to work out people’s intentions" }
        ],
        responses: Array(10).fill(null),
        additional: {
            relation: ''
        },
        prediction: "",
        confidence: "",
        model: {
            coefficients: [],
            intercept: 0
        }
    },
    mounted() {
        fetch('src/model_lr.json')
            .then(response => response.json())
            .then(data => {
                this.model.coefficients = data.coefficients[0];
                this.model.intercept = data.intercept[0];
            })
            .catch(error => {
                this.prediction = "Model could not be loaded. Please check again later.";
            });
    },
    methods: {
        sigmoid(z) {
            return 1 / (1 + Math.exp(-z));
        },
        encodeInputs() {
            const agreePoints = [1, 7, 8, 10];
            const disagreePoints = [2, 3, 4, 5, 6, 9];
            const encodedResponses = this.responses.map((response, index) => {
                const qNumber = index + 1;
                if (agreePoints.includes(qNumber)) {
                    return response === "Agree" ? 1 : 0;
                } else if (disagreePoints.includes(qNumber)) {
                    return response === "Disagree" ? 1 : 0;
                }
                return 0;
            });

            // **Only include 'relation' as it's the remaining additional feature**
            const relation = parseInt(this.additional.relation) || 0;

            return [...encodedResponses, relation];
        },
        predict() {
            if (this.responses.includes(null) || this.additional.relation === '') {
                this.prediction = "You need to answer all questions.";
                this.confidence = "";
                return;
            }

            const inputFeatures = this.encodeInputs();
            if (inputFeatures.length !== this.model.coefficients.length) {
                this.prediction = "Error: Input length does not match the model requirements. Please check inputs and try again.";
                this.confidence = "";
                return;
            }

            let z = this.model.intercept;
            for (let i = 0; i < inputFeatures.length; i++) {
                z += inputFeatures[i] * this.model.coefficients[i];
            }
            if (isNaN(z)) {
                this.prediction = "An error occurred in the calculation. Please check inputs.";
                this.confidence = "";
                return;
            }

            const probability = this.sigmoid(z);
            const confidencePercentage = (probability * 100).toFixed(2);
            const threshold = 0.5;

            if (probability >= threshold) {
                this.prediction = "You are likely to have autism.";
                this.confidence = `The model is ${confidencePercentage}% confident in this result.`;
            } else {
                this.prediction = "You are unlikely to have autism.";
                this.confidence = `The model is ${100 - confidencePercentage}% confident that you are not autistic.`;
            }
        }
    }
});
